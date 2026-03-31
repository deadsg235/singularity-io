"""
x402_gate.py — X402 payment gate for Singularity.io FastAPI backend.

Implements HTTP 402 payment-required enforcement for premium endpoints.
The gate checks the X-Payment header, verifies the Solana transaction
on-chain, and grants access if valid.

For the vanilla JS frontend (pre-Next.js migration), this module provides:
  - require_payment() — FastAPI dependency that enforces X402
  - build_402_response() — constructs the PaymentRequired payload
  - verify_payment() — validates X-Payment header against Solana RPC
"""

from __future__ import annotations

import base64
import json
import logging
import os
import time
from typing import Any, Dict, Optional

import httpx
from fastapi import Header, HTTPException, Request
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)

# ── Config ────────────────────────────────────────────────────────────────────

SOLANA_RPC      = os.getenv("SOLANA_RPC_URL", "https://api.mainnet-beta.solana.com")
TREASURY_WALLET = os.getenv("X402_TREASURY_WALLET", "")
FACILITATOR_URL = os.getenv("X402_FACILITATOR_URL", "")

# Token mints
USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
SIO_MINT  = "Fuj6EDWQHBnQ3eEvYDujNQ4rPLSkhm3pBySbQ79Bpump"

# Solana mainnet CAIP-2
SOLANA_MAINNET = "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp"

# Price per route in USDC smallest units (1 USDC = 1_000_000)
ROUTE_PRICES: Dict[str, int] = {
    "/api/ai/query":         int(float(os.getenv("X402_PRICE_AI_QUERY",    "0.001")) * 1_000_000),
    "/api/guardian/premium": int(float(os.getenv("X402_PRICE_GUARDIAN",    "0.0005")) * 1_000_000),
    "/api/bots/signals":     int(float(os.getenv("X402_PRICE_BOT_SIGNALS", "0.002")) * 1_000_000),
}

# ── 402 Response builder ──────────────────────────────────────────────────────

def build_402_response(route: str, error: Optional[str] = None) -> JSONResponse:
    """Return a well-formed HTTP 402 PaymentRequired response."""
    price = ROUTE_PRICES.get(route, 1000)
    payload: Dict[str, Any] = {
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
                    "description": f"Access to {route}",
                },
            }
        ],
    }
    if error:
        payload["error"] = error

    return JSONResponse(status_code=402, content=payload)


# ── Payment verification ──────────────────────────────────────────────────────

async def verify_payment_header(x_payment: str, route: str) -> Dict[str, Any]:
    """
    Decode and verify an X-Payment header.

    Returns the decoded payload dict on success.
    Raises HTTPException(402) on failure.
    """
    # Decode base64 payload
    try:
        decoded = base64.b64decode(x_payment + "==").decode("utf-8")
        payload = json.loads(decoded)
    except Exception as e:
        raise HTTPException(
            status_code=402,
            detail=build_402_response(route, f"Malformed X-Payment header: {e}").body.decode()
        )

    # Basic schema check
    if payload.get("x402Version") != 2:
        raise HTTPException(status_code=402, detail="Unsupported x402Version")

    tx_b64 = payload.get("payload", {}).get("transaction", "")
    if not tx_b64:
        raise HTTPException(status_code=402, detail="Missing transaction in payload")

    # If a Facilitator URL is configured, delegate verification to it
    if FACILITATOR_URL:
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.post(
                    f"{FACILITATOR_URL}/verify",
                    json={"payment": payload, "route": route},
                )
                if resp.status_code != 200:
                    raise HTTPException(status_code=402, detail="Payment verification failed")
                return resp.json()
        except httpx.RequestError as e:
            logger.warning("Facilitator unreachable: %s", e)
            # Fall through to on-chain verification

    # Direct on-chain verification via Solana RPC
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # Send the transaction to get its signature
            send_resp = await client.post(
                SOLANA_RPC,
                json={
                    "jsonrpc": "2.0", "id": 1,
                    "method": "sendTransaction",
                    "params": [tx_b64, {"encoding": "base64", "skipPreflight": True, "maxRetries": 0}]
                }
            )
            result = send_resp.json()
            if "error" in result:
                # Transaction may already be confirmed — try to get signature from payload
                sig = payload.get("payload", {}).get("signature", "")
                if not sig:
                    raise HTTPException(status_code=402, detail=f"Transaction rejected: {result['error']['message']}")
            else:
                sig = result.get("result", "")

            if not sig:
                raise HTTPException(status_code=402, detail="No transaction signature")

            # Poll for confirmation (up to 10s)
            for _ in range(10):
                await _sleep(1)
                status_resp = await client.post(
                    SOLANA_RPC,
                    json={
                        "jsonrpc": "2.0", "id": 1,
                        "method": "getSignatureStatuses",
                        "params": [[sig], {"searchTransactionHistory": True}]
                    }
                )
                status = status_resp.json().get("result", {}).get("value", [None])[0]
                if status and status.get("confirmationStatus") in ("confirmed", "finalized"):
                    if status.get("err"):
                        raise HTTPException(status_code=402, detail="Transaction failed on-chain")
                    return {"signature": sig, "status": "confirmed"}

            raise HTTPException(status_code=402, detail="Transaction confirmation timeout")

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Payment verification error: %s", e)
        raise HTTPException(status_code=402, detail=f"Verification error: {e}")


async def _sleep(seconds: float) -> None:
    import asyncio
    await asyncio.sleep(seconds)


# ── FastAPI dependency ────────────────────────────────────────────────────────

async def require_payment(
    request: Request,
    x_payment: Optional[str] = Header(default=None, alias="X-Payment"),
) -> Dict[str, Any]:
    """
    FastAPI dependency — add to any endpoint that requires X402 payment.

    Usage:
        @router.post("/api/ai/query")
        async def query(payment: dict = Depends(require_payment)):
            ...

    Returns the verified payment info dict on success.
    Raises 402 if no valid payment header is present.
    """
    route = request.url.path

    if not x_payment:
        raise HTTPException(
            status_code=402,
            detail=build_402_response(route).body.decode()
        )

    return await verify_payment_header(x_payment, route)


# ── Settlement receipt builder ────────────────────────────────────────────────

def build_settlement_receipt(signature: str, route: str) -> str:
    """Build the X-Payment-Response header value."""
    receipt = {
        "success":   True,
        "signature": signature,
        "route":     route,
        "timestamp": int(time.time()),
    }
    return base64.b64encode(json.dumps(receipt).encode()).decode()
