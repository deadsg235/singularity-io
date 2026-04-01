"""
x402_gate.py — X402 Payment Gate for Singularity.io

Implements the canonical x402 protocol (coinbase/x402 spec):
  - HTTP 402 response with PAYMENT-REQUIRED JSON body
  - X-Payment header parsing (base64 JSON ExactSvmPayloadV2)
  - Facilitator delegation (CDP or x402.org) with on-chain RPC fallback
  - X-Payment-Response receipt header on success
  - FastAPI dependency: require_payment()

Spec: https://docs.cdp.coinbase.com/x402/quickstart-for-sellers
"""

from __future__ import annotations

import asyncio
import base64
import json
import logging
import os
import time
from typing import Any, Dict, List, Optional

import httpx
from fastapi import Depends, Header, HTTPException, Request
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)

# ── Config ────────────────────────────────────────────────────────────────────

SOLANA_RPC_POOL: List[str] = [
    os.getenv("SOLANA_RPC_URL", "https://api.mainnet-beta.solana.com"),
    "https://solana-mainnet.phantom.tech",
    "https://rpc.ankr.com/solana",
]

# Facilitator — CDP recommended for mainnet, x402.org for testnet
FACILITATOR_URL: str = os.getenv(
    "X402_FACILITATOR_URL",
    "https://x402.org/facilitator"   # testnet default; swap for CDP in prod
)

# Receiving wallet (treasury)
TREASURY_WALLET: str = os.getenv("X402_TREASURY_WALLET", "")

# Token mints
USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
SIO_MINT  = "Fuj6EDWQHBnQ3eEvYDujNQ4rPLSkhm3pBySbQ79Bpump"

# Solana CAIP-2 network IDs
SOLANA_MAINNET = "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp"
SOLANA_DEVNET  = "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1"

# Route prices in USDC smallest units (1 USDC = 1_000_000)
ROUTE_PRICES: Dict[str, int] = {
    "/api/ai/query":         int(float(os.getenv("X402_PRICE_AI_QUERY",    "0.001"))  * 1_000_000),
    "/api/guardian/premium": int(float(os.getenv("X402_PRICE_GUARDIAN",    "0.0005")) * 1_000_000),
    "/api/bots/signals":     int(float(os.getenv("X402_PRICE_BOT_SIGNALS", "0.002"))  * 1_000_000),
}

ROUTE_DESCRIPTIONS: Dict[str, str] = {
    "/api/ai/query":         "ULTIMA AI query (Groq Llama 3.3 70B)",
    "/api/guardian/premium": "Guardian premium wallet analytics",
    "/api/bots/signals":     "DQN trading signals",
}

# ── 402 Response ──────────────────────────────────────────────────────────────

def build_402_response(route: str, error: Optional[str] = None) -> JSONResponse:
    """
    Construct a canonical x402 PaymentRequired response.

    Body schema matches coinbase/x402 spec:
    {
      "x402Version": 2,
      "accepts": [{ scheme, network, maxAmountRequired, asset, payTo, ... }],
      "error": "..." (optional)
    }
    """
    price = ROUTE_PRICES.get(route, 1000)
    desc  = ROUTE_DESCRIPTIONS.get(route, f"Access to {route}")

    body: Dict[str, Any] = {
        "x402Version": 2,
        "accepts": [
            {
                "scheme":            "exact",
                "network":           SOLANA_MAINNET,
                "maxAmountRequired": str(price),
                "asset":             USDC_MINT,
                "payTo":             TREASURY_WALLET or "TREASURY_NOT_CONFIGURED",
                "maxTimeoutSeconds": 300,
                "extra": {
                    "name":        route.lstrip("/").replace("/", "-"),
                    "description": desc,
                },
            }
        ],
    }
    if error:
        body["error"] = error

    return JSONResponse(status_code=402, content=body)


# ── Payload parsing ───────────────────────────────────────────────────────────

def _decode_x_payment(header_value: str) -> Dict[str, Any]:
    """
    Decode the X-Payment header (base64 JSON ExactSvmPayloadV2).
    Raises ValueError on malformed input — never throws unexpectedly.
    """
    try:
        # Pad base64 if needed
        padded = header_value + "=" * (-len(header_value) % 4)
        decoded = base64.b64decode(padded).decode("utf-8")
        return json.loads(decoded)
    except Exception as exc:
        raise ValueError(f"Malformed X-Payment header: {exc}") from exc


def _validate_payload(payload: Dict[str, Any], route: str) -> str:
    """
    Validate ExactSvmPayloadV2 schema.
    Returns the base64 transaction string.
    Raises ValueError on schema violations.
    """
    if payload.get("x402Version") != 2:
        raise ValueError(f"Unsupported x402Version: {payload.get('x402Version')}")
    if payload.get("scheme") != "exact":
        raise ValueError(f"Unsupported scheme: {payload.get('scheme')}")

    inner = payload.get("payload", {})
    tx_b64 = inner.get("transaction", "")
    if not tx_b64:
        raise ValueError("Missing payload.transaction")

    return tx_b64


# ── Facilitator verification ──────────────────────────────────────────────────

async def _verify_via_facilitator(
    payload: Dict[str, Any],
    route: str,
    client: httpx.AsyncClient,
) -> Dict[str, Any]:
    """
    Delegate verification to the x402 Facilitator (CDP or x402.org).
    POST /verify with { payment, route } → { success, signature }
    """
    resp = await client.post(
        f"{FACILITATOR_URL}/verify",
        json={"payment": payload, "route": route},
        timeout=15.0,
    )
    if resp.status_code != 200:
        raise ValueError(f"Facilitator rejected payment: HTTP {resp.status_code}")
    data = resp.json()
    if not data.get("success"):
        raise ValueError(f"Facilitator verification failed: {data.get('error', 'unknown')}")
    return data


# ── On-chain RPC fallback ─────────────────────────────────────────────────────

async def _rpc(client: httpx.AsyncClient, method: str, params: list) -> Any:
    last_err = None
    for url in SOLANA_RPC_POOL:
        try:
            r = await client.post(
                url,
                json={"jsonrpc": "2.0", "id": 1, "method": method, "params": params},
                timeout=10.0,
            )
            data = r.json()
            if "error" in data:
                raise ValueError(data["error"].get("message", "RPC error"))
            return data.get("result")
        except Exception as e:
            last_err = e
    raise ValueError(f"All RPC endpoints failed: {last_err}")


async def _verify_via_rpc(tx_b64: str, client: httpx.AsyncClient) -> str:
    """
    Send the transaction and poll for confirmation.
    Returns the confirmed signature.
    """
    result = await _rpc(client, "sendTransaction", [
        tx_b64,
        {"encoding": "base64", "skipPreflight": False, "maxRetries": 3},
    ])
    sig = result if isinstance(result, str) else None
    if not sig:
        raise ValueError("sendTransaction returned no signature")

    for _ in range(30):
        await asyncio.sleep(1)
        statuses = await _rpc(client, "getSignatureStatuses", [
            [sig], {"searchTransactionHistory": False}
        ])
        entry = (statuses or {}).get("value", [None])[0]
        if entry:
            if entry.get("err"):
                raise ValueError(f"Transaction failed on-chain: {entry['err']}")
            conf = entry.get("confirmationStatus", "")
            if conf in ("confirmed", "finalized"):
                return sig

    raise ValueError("Transaction confirmation timeout")


# ── Main verification entry point ─────────────────────────────────────────────

async def verify_x_payment(x_payment: str, route: str) -> Dict[str, Any]:
    """
    Full X-Payment header verification pipeline:
      1. Decode + validate payload schema
      2. Try facilitator verification
      3. Fall back to direct RPC if facilitator is unreachable
    Returns verified result dict with 'signature' key.
    Raises HTTPException(402) on any failure.
    """
    # Decode
    try:
        payload = _decode_x_payment(x_payment)
        tx_b64  = _validate_payload(payload, route)
    except ValueError as exc:
        raise HTTPException(
            status_code=402,
            detail=str(exc),
        )

    async with httpx.AsyncClient() as client:
        # Try facilitator first
        if FACILITATOR_URL:
            try:
                result = await _verify_via_facilitator(payload, route, client)
                logger.info("Payment verified via facilitator: %s", result.get("signature", "")[:16])
                return result
            except Exception as fac_err:
                logger.warning("Facilitator unavailable (%s), falling back to RPC", fac_err)

        # RPC fallback
        try:
            sig = await _verify_via_rpc(tx_b64, client)
            logger.info("Payment verified via RPC: %s", sig[:16])
            return {"success": True, "signature": sig}
        except ValueError as rpc_err:
            raise HTTPException(status_code=402, detail=str(rpc_err))


# ── Settlement receipt ────────────────────────────────────────────────────────

def build_payment_response_header(signature: str, route: str) -> str:
    """
    Build the X-Payment-Response header value (base64 JSON receipt).
    Mirrors the coinbase/x402 facilitator settle response format.
    """
    receipt = {
        "success":   True,
        "signature": signature,
        "route":     route,
        "timestamp": int(time.time()),
        "network":   SOLANA_MAINNET,
    }
    return base64.b64encode(json.dumps(receipt).encode()).decode()


# ── FastAPI dependency ────────────────────────────────────────────────────────

async def require_payment(
    request: Request,
    x_payment: Optional[str] = Header(default=None, alias="X-Payment"),
) -> Dict[str, Any]:
    """
    FastAPI dependency — enforces x402 payment on any route.

    Usage:
        from x402_gate import require_payment, build_402_response

        @router.get("/api/bots/signals")
        async def signals(payment: dict = Depends(require_payment)):
            ...

    Returns verified payment dict on success.
    Returns HTTP 402 with PaymentRequired body if no valid payment.
    """
    route = request.url.path

    if not x_payment:
        return build_402_response(route)   # returns JSONResponse(402)

    result = await verify_x_payment(x_payment, route)
    return result


# ── Convenience: gated_route decorator ───────────────────────────────────────

def gated_route(route_path: str):
    """
    Decorator factory for FastAPI route handlers that require x402 payment.

    Usage:
        @router.get("/api/guardian/premium")
        @gated_route("/api/guardian/premium")
        async def premium(request: Request):
            ...
    """
    def decorator(func):
        import functools

        @functools.wraps(func)
        async def wrapper(request: Request, *args, **kwargs):
            x_payment = request.headers.get("X-Payment")
            if not x_payment:
                return build_402_response(route_path)
            try:
                payment = await verify_x_payment(x_payment, route_path)
            except HTTPException as e:
                return build_402_response(route_path, error=str(e.detail))

            # Inject payment info into kwargs
            kwargs["payment"] = payment
            response = await func(request, *args, **kwargs)

            # Attach receipt header
            if hasattr(response, "headers"):
                sig = payment.get("signature", "")
                response.headers["X-Payment-Response"] = build_payment_response_header(sig, route_path)

            return response

        return wrapper
    return decorator
