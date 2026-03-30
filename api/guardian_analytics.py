"""
guardian_analytics.py — Real on-chain wallet risk analysis for Singularity.io Guardian.

Endpoints:
  GET /api/guardian/analyze/{address}  — risk score + flagged txs + portfolio
  GET /api/guardian/history/{address}  — paginated transaction history
"""

from __future__ import annotations

import asyncio
import logging
import os
import time
from typing import Any, Dict, List, Optional

import httpx
from fastapi import APIRouter, HTTPException, Query

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/guardian", tags=["guardian"])

# ── Constants ─────────────────────────────────────────────────────────────────

SIO_MINT = "Fuj6EDWQHBnQ3eEvYDujNQ4rPLSkhm3pBySbQ79Bpump"

RPC_POOL = [
    os.getenv("SOLANA_RPC_URL", "https://api.mainnet-beta.solana.com"),
    "https://solana-mainnet.phantom.tech",
    "https://rpc.ankr.com/solana",
    "https://api.metaplex.solana.com",
]

# Known malicious / high-risk program addresses
BLOCKLIST: set[str] = {
    "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin",  # Serum v2 (deprecated, exploit risk)
    "PhoeNiXZ8ByJGLkxNfZRnkUfjvmuYqLR89jjFHGqdXY",   # Phoenix (flagged)
    "JUP2jxvXaqu7NQY1GmNF4m1vodwdXNFkAMkjcJyNNGC",   # Jupiter v1 (deprecated)
}

JUPITER_PRICE_URL = "https://price.jup.ag/v6/price"
JUPITER_TOKEN_URL = "https://token.jup.ag/all"

# ── DQN engine (optional — graceful fallback) ─────────────────────────────────

_engine = None

def _get_engine():
    global _engine
    if _engine is not None:
        return _engine
    try:
        from dqn_core.engine import DQNReasoningEngine
        from pathlib import Path as _Path
        model_path = str(_Path(__file__).parent.parent / "dqn-core" / "reasoning_dqn_model.pth")
        _engine = DQNReasoningEngine(
            state_size=128, action_size=10,
            model_path=model_path if _Path(model_path).exists() else None,
            mode="trading",
        )
        logger.info("DQN engine loaded for Guardian")
    except Exception as e:
        logger.warning("DQN engine unavailable: %s", e)
        _engine = None
    return _engine

# ── RPC helpers ───────────────────────────────────────────────────────────────

async def _rpc(client: httpx.AsyncClient, method: str, params: list) -> Any:
    payload = {"jsonrpc": "2.0", "id": 1, "method": method, "params": params}
    last_err = None
    for url in RPC_POOL:
        try:
            r = await client.post(url, json=payload, timeout=10.0)
            data = r.json()
            if "error" in data:
                raise ValueError(data["error"].get("message", "RPC error"))
            return data.get("result")
        except Exception as e:
            last_err = e
    raise HTTPException(status_code=502, detail=f"RPC error: {last_err}")


async def _fetch_sol_balance(client: httpx.AsyncClient, address: str) -> float:
    result = await _rpc(client, "getBalance", [address, {"commitment": "confirmed"}])
    lamports = result.get("value", result) if isinstance(result, dict) else result
    return (lamports or 0) / 1e9


async def _fetch_token_accounts(client: httpx.AsyncClient, address: str) -> List[Dict]:
    result = await _rpc(client, "getTokenAccountsByOwner", [
        address,
        {"programId": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"},
        {"encoding": "jsonParsed", "commitment": "confirmed"},
    ])
    return (result or {}).get("value", [])


async def _fetch_signatures(
    client: httpx.AsyncClient, address: str, limit: int = 50, before: Optional[str] = None
) -> List[Dict]:
    params: list = [address, {"limit": limit, "commitment": "confirmed"}]
    if before:
        params[1]["before"] = before
    result = await _rpc(client, "getSignaturesForAddress", params)
    return result or []


async def _fetch_token_prices(mints: List[str]) -> Dict[str, float]:
    if not mints:
        return {}
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            r = await client.get(JUPITER_PRICE_URL, params={"ids": ",".join(mints)})
            data = r.json().get("data", {})
            return {mint: float(data[mint]["price"]) for mint in mints if mint in data}
    except Exception:
        return {}


# ── Risk scoring ──────────────────────────────────────────────────────────────

def _compute_risk_score(
    sol_balance: float,
    token_count: int,
    flagged_count: int,
    tx_count: int,
    failed_tx_count: int,
    dqn_engine=None,
) -> tuple[float, str]:
    """
    Heuristic risk score (0–100) with optional DQN refinement.
    Returns (score, label).
    """
    score = 0.0

    # Flagged program interactions — highest weight
    score += min(flagged_count * 15, 45)

    # High failed tx ratio
    if tx_count > 0:
        fail_ratio = failed_tx_count / tx_count
        score += fail_ratio * 20

    # Very low SOL (dust wallet pattern)
    if sol_balance < 0.001:
        score += 10

    # Token concentration risk (too many low-value tokens)
    if token_count > 30:
        score += 10
    elif token_count > 15:
        score += 5

    score = min(score, 100.0)

    # DQN refinement — blend heuristic with neural score
    if dqn_engine is not None:
        try:
            wallet_features = [
                min(sol_balance / 50.0, 1.0),
                min(token_count / 50.0, 1.0),
                min(flagged_count / 10.0, 1.0),
                min(tx_count / 1000.0, 1.0),
                min(failed_tx_count / 100.0, 1.0),
            ] + [0.0] * 123
            dqn_result = dqn_engine.infer_risk_score(wallet_features)
            dqn_score = dqn_result["risk_score"]
            # Weighted blend: 60% heuristic, 40% DQN
            score = 0.6 * score + 0.4 * dqn_score
        except Exception:
            pass

    score = round(min(max(score, 0.0), 100.0), 2)

    if score < 15:
        label = "SAFE"
    elif score < 35:
        label = "LOW_RISK"
    elif score < 55:
        label = "MODERATE_RISK"
    elif score < 75:
        label = "HIGH_RISK"
    else:
        label = "CRITICAL_RISK"

    return score, label


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/analyze/{address}")
async def analyze_wallet(address: str) -> Dict[str, Any]:
    """
    Full on-chain wallet analysis.
    Returns risk score, flagged transactions, portfolio breakdown.
    """
    if len(address) < 32 or len(address) > 44:
        raise HTTPException(status_code=400, detail="Invalid Solana address")

    async with httpx.AsyncClient(timeout=15.0) as client:
        # Fetch in parallel
        sol_task = asyncio.create_task(_fetch_sol_balance(client, address))
        token_task = asyncio.create_task(_fetch_token_accounts(client, address))
        sig_task = asyncio.create_task(_fetch_signatures(client, address, limit=50))

        try:
            sol_balance, token_accounts, signatures = await asyncio.gather(
                sol_task, token_task, sig_task, return_exceptions=False
            )
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"RPC fetch failed: {e}")

    # ── Flagged transactions ──────────────────────────────────────────────
    flagged_txs: List[str] = []
    failed_count = 0
    for sig_info in signatures:
        if sig_info.get("err"):
            failed_count += 1
        # We'd need to fetch full tx to check program IDs — flag high-error-rate wallets
        # For now flag signatures with known error patterns
        if sig_info.get("err") and sig_info.get("signature"):
            flagged_txs.append(sig_info["signature"])

    # ── Portfolio ─────────────────────────────────────────────────────────
    mints = []
    token_map: Dict[str, Dict] = {}
    for acct in token_accounts:
        try:
            info = acct["account"]["data"]["parsed"]["info"]
            mint = info["mint"]
            ui_amount = info["tokenAmount"]["uiAmount"] or 0
            if ui_amount > 0:
                mints.append(mint)
                token_map[mint] = {"balance": ui_amount, "decimals": info["tokenAmount"]["decimals"]}
        except (KeyError, TypeError):
            continue

    # Fetch prices for all held tokens
    prices = await _fetch_token_prices(mints[:20])  # cap at 20 to avoid rate limits

    # SOL price
    sol_prices = await _fetch_token_prices(["So11111111111111111111111111111111111111112"])
    sol_price_usd = sol_prices.get("So11111111111111111111111111111111111111112", 0.0)

    portfolio_items = []
    total_usd = sol_balance * sol_price_usd

    for mint, data in token_map.items():
        price = prices.get(mint, 0.0)
        usd_value = data["balance"] * price
        total_usd += usd_value
        portfolio_items.append({
            "mint": mint,
            "symbol": mint[:6] + "…",  # placeholder — full symbol needs token list lookup
            "balance": data["balance"],
            "usd_value": round(usd_value, 4),
            "change_24h_pct": 0.0,  # would need historical price
            "portfolio_pct": 0.0,   # computed below
        })

    # Add SOL as first item
    sol_item = {
        "mint": "So11111111111111111111111111111111111111112",
        "symbol": "SOL",
        "balance": sol_balance,
        "usd_value": round(sol_balance * sol_price_usd, 4),
        "change_24h_pct": 0.0,
        "portfolio_pct": 0.0,
    }
    portfolio_items.insert(0, sol_item)

    # Compute portfolio percentages
    if total_usd > 0:
        for item in portfolio_items:
            item["portfolio_pct"] = round(item["usd_value"] / total_usd * 100, 2)
        # Normalize to exactly 100
        diff = 100.0 - sum(i["portfolio_pct"] for i in portfolio_items)
        if portfolio_items:
            portfolio_items[0]["portfolio_pct"] = round(
                portfolio_items[0]["portfolio_pct"] + diff, 2
            )

    # ── Risk score ────────────────────────────────────────────────────────
    engine = _get_engine()
    risk_score, risk_label = _compute_risk_score(
        sol_balance=sol_balance,
        token_count=len(token_map),
        flagged_count=len(flagged_txs),
        tx_count=len(signatures),
        failed_tx_count=failed_count,
        dqn_engine=engine,
    )

    return {
        "wallet": address,
        "risk_score": risk_score,
        "risk_label": risk_label,
        "flagged_transactions": flagged_txs[:20],
        "portfolio": portfolio_items,
        "historical_pnl": 0.0,  # requires full tx history parsing
        "sol_balance": round(sol_balance, 6),
        "token_count": len(token_map),
        "tx_count": len(signatures),
        "dqn_available": engine is not None,
        "analyzed_at": int(time.time()),
    }


@router.get("/history/{address}")
async def get_transaction_history(
    address: str,
    limit: int = Query(default=50, le=50, ge=1),
    before: Optional[str] = Query(default=None),
) -> Dict[str, Any]:
    """
    Paginated transaction history for a wallet.
    Returns at most 50 transactions per page (Correctness Property 8).
    """
    if len(address) < 32 or len(address) > 44:
        raise HTTPException(status_code=400, detail="Invalid Solana address")

    async with httpx.AsyncClient(timeout=12.0) as client:
        signatures = await _fetch_signatures(client, address, limit=limit, before=before)

    return {
        "wallet": address,
        "transactions": signatures,
        "count": len(signatures),
        "has_more": len(signatures) == limit,
        "next_before": signatures[-1]["signature"] if signatures else None,
    }
