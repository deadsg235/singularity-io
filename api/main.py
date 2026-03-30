"""
main.py — Singularity.io FastAPI application.

Registers all routers and middleware. Entry point for Vercel via api/index.py.
"""

from __future__ import annotations

import logging
import os
import time
from typing import Any, Dict

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger(__name__)

# ── App ───────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Singularity.io API",
    description="Full-stack Solana DeFi platform — AI trading, Guardian analytics, X402 payments",
    version="0.6.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# ── CORS ──────────────────────────────────────────────────────────────────────

ALLOWED_ORIGIN = os.getenv("ALLOWED_ORIGIN", "*")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[ALLOWED_ORIGIN] if ALLOWED_ORIGIN != "*" else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Request logging middleware ────────────────────────────────────────────────

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    ms = round((time.time() - start) * 1000, 1)
    logger.info("%s %s %d %.1fms", request.method, request.url.path, response.status_code, ms)
    return response

# ── Routers ───────────────────────────────────────────────────────────────────

def _include(module_name: str, attr: str = "router") -> bool:
    try:
        import importlib
        mod = importlib.import_module(module_name)
        r = getattr(mod, attr)
        app.include_router(r)
        logger.info("Router loaded: %s", module_name)
        return True
    except Exception as e:
        logger.warning("Router unavailable: %s — %s", module_name, e)
        return False

_include("guardian_analytics")
_include("bot_agent")

# Optional routers — load if available
for _mod in [
    "governance",
    "analytics",
    "revenue",
    "social",
    "staking",
    "sio_swap",
    "sio_staking",
    "guardian_advanced",
    "sio_payments",
    "access_control",
    "neural_protected",
    "services_catalog",
    "leaderboard",
    "portfolio",
    "network",
    "groq_chat",
    "langchain_agent",
]:
    _include(_mod)

# ── Core endpoints ────────────────────────────────────────────────────────────

@app.get("/", include_in_schema=False)
def root() -> Dict[str, Any]:
    return {
        "name": "Singularity.io API",
        "version": "0.6.0",
        "docs": "/api/docs",
    }


@app.get("/api/health")
def health() -> Dict[str, Any]:
    return {
        "status": "healthy",
        "service": "singularity-api",
        "version": "0.6.0",
        "timestamp": int(time.time()),
    }


@app.get("/api/wallet/{address}")
async def get_wallet(address: str) -> Dict[str, Any]:
    """SOL + S-IO token balances for any address."""
    import httpx

    SIO_MINT = "Fuj6EDWQHBnQ3eEvYDujNQ4rPLSkhm3pBySbQ79Bpump"
    RPC = os.getenv("SOLANA_RPC_URL", "https://api.mainnet-beta.solana.com")

    async def rpc(method: str, params: list):
        async with httpx.AsyncClient(timeout=8.0) as client:
            r = await client.post(RPC, json={"jsonrpc": "2.0", "id": 1, "method": method, "params": params})
            return r.json().get("result")

    try:
        sol_result = await rpc("getBalance", [address, {"commitment": "confirmed"}])
        sol = ((sol_result or {}).get("value", sol_result) or 0) / 1e9

        token_result = await rpc("getTokenAccountsByOwner", [
            address,
            {"mint": SIO_MINT},
            {"encoding": "jsonParsed"},
        ])
        accounts = (token_result or {}).get("value", [])
        sio = 0.0
        if accounts:
            sio = accounts[0]["account"]["data"]["parsed"]["info"]["tokenAmount"]["uiAmount"] or 0.0

        return {"address": address, "sol": round(sol, 6), "sio": round(sio, 6)}
    except Exception as e:
        return JSONResponse(status_code=502, content={"error": "RPC_ERROR", "message": str(e)})
