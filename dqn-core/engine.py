"""
engine.py — DQNReasoningEngine: high-level facade used by the Singularity.io platform.

This is the single entry-point consumed by:
  - The FastAPI backend  (/api/bots, /api/ai)
  - The ULTIMA terminal  (query → reasoning → response action)
  - The Guardian module  (wallet state → risk action)
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any, Dict, List, Optional

import torch

from .agent import DQNAgent
from .environment import ReasoningEnvironment

logger = logging.getLogger(__name__)

# Action vocabulary — maps integer action indices to human-readable labels
TRADING_ACTIONS = [
    "STRONG_BUY",
    "BUY",
    "WEAK_BUY",
    "HOLD",
    "WEAK_SELL",
    "SELL",
    "STRONG_SELL",
    "INCREASE_POSITION",
    "REDUCE_POSITION",
    "EXIT",
]

RISK_ACTIONS = [
    "SAFE",
    "LOW_RISK",
    "MODERATE_RISK",
    "HIGH_RISK",
    "CRITICAL_RISK",
    "FLAGGED",
    "BLOCKED",
    "MONITOR",
    "ALERT",
    "EMERGENCY",
]


class DQNReasoningEngine:
    """
    5-Layer DQN Reasoning Engine — the AI backbone of Singularity.io.

    Provides:
      - infer_trading_action(market_state)  → trading signal
      - infer_risk_score(wallet_state)      → risk label + score
      - train_episode(env)                  → run one training episode
      - save / load model checkpoints

    Args:
        state_size:    Input state dimensionality (default 128).
        action_size:   Number of output actions (default 10).
        model_path:    Optional path to load a pre-trained checkpoint.
        mode:          "trading" | "risk" — selects the action vocabulary.
    """

    def __init__(
        self,
        state_size: int = 128,
        action_size: int = 10,
        model_path: Optional[str] = None,
        mode: str = "trading",
    ):
        self.state_size = state_size
        self.action_size = action_size
        self.mode = mode
        self.actions = TRADING_ACTIONS if mode == "trading" else RISK_ACTIONS

        self.agent = DQNAgent(state_size=state_size, action_size=action_size)

        if model_path and Path(model_path).exists():
            self.agent.load(model_path)
            logger.info("Loaded DQN checkpoint from %s", model_path)

    # ── Inference ───────────────────────────────────────────────────────────

    def infer_trading_action(
        self,
        price: float,
        volume: float,
        rsi: float = 50.0,
        macd: float = 0.0,
        bb_upper: float = 0.0,
        bb_lower: float = 0.0,
        sol_tps: float = 3000.0,
        wallet_balance: float = 0.0,
        extra: Optional[List[float]] = None,
    ) -> Dict[str, Any]:
        """
        Given live market data, return a trading action recommendation.

        Returns:
            {
                "action_index": int,
                "action_label": str,
                "q_values": List[float],
                "confidence": float,
            }
        """
        state = ReasoningEnvironment.from_market_snapshot(
            price, volume, rsi, macd, bb_upper, bb_lower, sol_tps, wallet_balance, extra
        )
        self.agent.online_net.eval()
        with torch.no_grad():
            q_values = self.agent.online_net(state).squeeze(0)
        action_idx = int(torch.argmax(q_values).item())
        q_list = q_values.tolist()
        confidence = float(torch.softmax(q_values, dim=0).max().item())

        return {
            "action_index": action_idx,
            "action_label": self.actions[action_idx] if action_idx < len(self.actions) else "UNKNOWN",
            "q_values": q_list,
            "confidence": confidence,
        }

    def infer_risk_score(self, wallet_features: List[float]) -> Dict[str, Any]:
        """
        Given wallet feature vector, return a risk assessment.

        Args:
            wallet_features: List of floats (up to 128 values).

        Returns:
            {
                "risk_index": int,
                "risk_label": str,
                "risk_score": float,   # 0–100
                "q_values": List[float],
            }
        """
        vec = torch.zeros(1, self.state_size)
        for i, v in enumerate(wallet_features[:self.state_size]):
            vec[0, i] = float(v)

        self.agent.online_net.eval()
        with torch.no_grad():
            q_values = self.agent.online_net(vec).squeeze(0)
        action_idx = int(torch.argmax(q_values).item())
        risk_score = float(action_idx / max(self.action_size - 1, 1) * 100)

        return {
            "risk_index": action_idx,
            "risk_label": RISK_ACTIONS[action_idx] if action_idx < len(RISK_ACTIONS) else "UNKNOWN",
            "risk_score": round(risk_score, 2),
            "q_values": q_values.tolist(),
        }

    # ── Training ────────────────────────────────────────────────────────────

    def train_episode(
        self,
        env: ReasoningEnvironment,
        epsilon: float = 0.1,
    ) -> Dict[str, float]:
        """
        Run one full training episode through the environment.

        Returns:
            {"total_reward": float, "mean_loss": float, "steps": int}
        """
        state = env.reset()
        total_reward = 0.0
        losses: List[float] = []
        steps = 0
        done = False

        while not done:
            action = self.agent.act(state, epsilon)
            next_state, reward, done, _ = env.step(action)
            loss = self.agent.step(state, action, reward, next_state, done)
            if loss is not None:
                losses.append(loss)
            state = next_state
            total_reward += reward
            steps += 1

        return {
            "total_reward": total_reward,
            "mean_loss": float(sum(losses) / len(losses)) if losses else 0.0,
            "steps": steps,
        }

    def train(
        self,
        data_path: str,
        episodes: int = 100,
        epsilon_start: float = 1.0,
        epsilon_end: float = 0.01,
        epsilon_decay: float = 0.995,
        save_path: Optional[str] = None,
    ) -> List[Dict[str, float]]:
        """
        Full training loop over a JSON dataset.

        Args:
            data_path:     Path to training_data.json
            episodes:      Number of training episodes
            epsilon_start: Initial exploration rate
            epsilon_end:   Minimum exploration rate
            epsilon_decay: Per-episode decay multiplier
            save_path:     If set, saves checkpoint after training

        Returns:
            List of per-episode metrics dicts.
        """
        env = ReasoningEnvironment(data_path, self.state_size, self.action_size)
        epsilon = epsilon_start
        history: List[Dict[str, float]] = []

        for ep in range(episodes):
            metrics = self.train_episode(env, epsilon)
            metrics["episode"] = float(ep + 1)
            metrics["epsilon"] = epsilon
            history.append(metrics)
            epsilon = max(epsilon_end, epsilon * epsilon_decay)
            logger.info(
                "Episode %d/%d | reward=%.2f | loss=%.4f | ε=%.3f",
                ep + 1, episodes, metrics["total_reward"], metrics["mean_loss"], epsilon,
            )

        if save_path:
            self.agent.save(save_path)
            logger.info("Checkpoint saved to %s", save_path)

        return history

    # ── Persistence ─────────────────────────────────────────────────────────

    def save(self, path: str) -> None:
        self.agent.save(path)

    def load(self, path: str) -> None:
        self.agent.load(path)
