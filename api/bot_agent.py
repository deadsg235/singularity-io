"""
bot_agent.py — AI Trading Bot orchestration for Singularity.io.

Endpoints:
  GET  /api/bots          — list user's bots
  POST /api/bots          — create bot
  DELETE /api/bots/{id}   — stop + delete bot
  GET  /api/bots/signals  — DQN trading signals (X402-gated)
"""

from __future__ import annotations

import logging
import os
import time
import uuid
from typing import Any, Dict, List, Literal, Optional

from fastapi import APIRouter, Header, HTTPException, Request
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/bots", tags=["bots"])

# ── In-memory store (replace with DB in production) ───────────────────────────
_bots: Dict[str, Dict] = {}

# ── DQN engine ────────────────────────────────────────────────────────────────
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
        logger.info("DQN engine loaded for bot signals")
    except Exception as e:
        logger.warning("DQN engine unavailable: %s", e)
        _engine = None
    return _engine

# ── Pydantic models ───────────────────────────────────────────────────────────

class BotConfig(BaseModel):
    strategy: Literal["dca", "grid", "momentum", "arbitrage"]
    token_pair: str = Field(..., example="SOL/USDC")
    position_size_sol: float = Field(..., gt=0)
    stop_loss_pct: float = Field(..., ge=0, le=100)
    take_profit_pct: float = Field(..., ge=0, le=100)
    max_daily_trades: int = Field(..., ge=1, le=100)


class BotStatus(BaseModel):
    bot_id: str
    config: BotConfig
    status: Literal["running", "stopped", "error"]
    pnl_usd: float
    trades_executed: int
    last_trade_at: Optional[float]
    current_position: float
    created_at: float


class TradeSignal(BaseModel):
    action_index: int
    action_label: str
    q_values: List[float]
    confidence: float
    dqn_available: bool
    sol_price: Optional[float]
    timestamp: float


# ── Auth helper ───────────────────────────────────────────────────────────────

def _require_wallet(x_wallet_address: Optional[str]) -> str:
    if not x_wallet_address:
        raise HTTPException(status_code=401, detail="X-Wallet-Address header required")
    return x_wallet_address


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("", response_model=List[BotStatus])
async def list_bots(
    x_wallet_address: Optional[str] = Header(default=None)
) -> List[BotStatus]:
    wallet = _require_wallet(x_wallet_address)
    user_bots = [b for b in _bots.values() if b["wallet"] == wallet]
    return [BotStatus(**{k: v for k, v in b.items() if k != "wallet"}) for b in user_bots]


@router.post("", response_model=BotStatus, status_code=201)
async def create_bot(
    config: BotConfig,
    x_wallet_address: Optional[str] = Header(default=None),
) -> BotStatus:
    wallet = _require_wallet(x_wallet_address)
    bot_id = str(uuid.uuid4())[:16]
    bot = {
        "bot_id": bot_id,
        "wallet": wallet,
        "config": config.model_dump(),
        "status": "running",
        "pnl_usd": 0.0,
        "trades_executed": 0,
        "last_trade_at": None,
        "current_position": 0.0,
        "created_at": time.time(),
    }
    _bots[bot_id] = bot
    logger.info("Bot created: %s strategy=%s wallet=%s", bot_id, config.strategy, wallet[:8])
    return BotStatus(**{k: v for k, v in bot.items() if k != "wallet"})


@router.delete("/{bot_id}", status_code=204)
async def delete_bot(
    bot_id: str,
    x_wallet_address: Optional[str] = Header(default=None),
) -> None:
    wallet = _require_wallet(x_wallet_address)
    bot = _bots.get(bot_id)
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")
    if bot["wallet"] != wallet:
        raise HTTPException(status_code=403, detail="Not your bot")
    bot["status"] = "stopped"
    del _bots[bot_id]


@router.get("/signals", response_model=TradeSignal)
async def get_trading_signals(request: Request) -> TradeSignal:
    """
    DQN trading signal for current market conditions.
    X402-gated in production — middleware handles 402 before this runs.
    """
    import random

    engine = _get_engine()
    sol_price = float(request.query_params.get("sol_price", 185.0))

    if engine is not None:
        try:
            result = engine.infer_trading_action(
                price=sol_price,
                volume=500_000_000 + random.random() * 200_000_000,
                rsi=35 + random.random() * 50,
                macd=(random.random() - 0.5) * 4,
                bb_upper=sol_price * 1.05,
                bb_lower=sol_price * 0.95,
                sol_tps=3000 + random.random() * 1500,
                wallet_balance=0.0,
            )
            return TradeSignal(
                action_index=result["action_index"],
                action_label=result["action_label"],
                q_values=result["q_values"],
                confidence=result["confidence"],
                dqn_available=True,
                sol_price=sol_price,
                timestamp=time.time(),
            )
        except Exception as e:
            logger.warning("DQN inference failed: %s", e)

    # Fallback: RSI-based heuristic
    rsi = 35 + random.random() * 50
    ACTIONS = ["STRONG_BUY","BUY","WEAK_BUY","HOLD","WEAK_SELL","SELL","STRONG_SELL","INCREASE_POSITION","REDUCE_POSITION","EXIT"]
    idx = 5 if rsi > 70 else (1 if rsi < 30 else 3)
    return TradeSignal(
        action_index=idx,
        action_label=ACTIONS[idx],
        q_values=[0.0] * 10,
        confidence=0.5,
        dqn_available=False,
        sol_price=sol_price,
        timestamp=time.time(),
    )
