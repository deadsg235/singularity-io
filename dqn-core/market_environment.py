"""
market_environment.py — Market-aware DQN environment for Singularity.io trading.

Replaces the text-based ReasoningEnvironment with a numeric market data environment.
State: 128-dim float vector from market snapshot
Action: 0-9 trading action index
Reward: +1 if action matches optimal action for scenario, 0 otherwise
"""

from __future__ import annotations

import json
import random
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import torch
import numpy as np


TRADING_ACTIONS = [
    "STRONG_BUY", "BUY", "WEAK_BUY", "HOLD", "WEAK_SELL",
    "SELL", "STRONG_SELL", "INCREASE_POSITION", "REDUCE_POSITION", "EXIT"
]

STATE_SIZE = 128
ACTION_SIZE = 10


class MarketEnvironment:
    """
    Numeric market data environment for DQN training.

    Each episode steps through market scenarios from the dataset.
    Reward = 1.0 if action matches the optimal action for the scenario.
    """

    def __init__(self, data_path: str | Path, shuffle: bool = True):
        self.data_path = Path(data_path)
        self.shuffle = shuffle
        self._scenarios: List[Dict] = self._load(data_path)
        self._idx = 0
        if shuffle:
            random.shuffle(self._scenarios)

    def reset(self) -> torch.Tensor:
        self._idx = 0
        if self.shuffle:
            random.shuffle(self._scenarios)
        return self._state(0)

    def step(self, action: int) -> Tuple[torch.Tensor, float, bool, Dict[str, Any]]:
        scenario = self._scenarios[self._idx]
        optimal = scenario.get("action", 3)  # default HOLD
        reward = 1.0 if action == optimal else 0.0
        self._idx += 1
        done = self._idx >= len(self._scenarios)
        next_state = self._state(self._idx) if not done else torch.zeros(1, STATE_SIZE)
        return next_state, reward, done, {"optimal": optimal, "index": self._idx}

    def _state(self, idx: int) -> torch.Tensor:
        if idx >= len(self._scenarios):
            return torch.zeros(1, STATE_SIZE)
        content = self._scenarios[idx]["content"]
        vals = [float(x) for x in content.split()]
        vec = np.zeros(STATE_SIZE, dtype=np.float32)
        for i, v in enumerate(vals[:STATE_SIZE]):
            vec[i] = v
        # Normalize key features
        if vec[0] > 0:  vec[0] /= 300.0   # price → 0-1
        if vec[1] > 0:  vec[1] /= 2e9     # volume → 0-1
        if vec[2] > 0:  vec[2] /= 100.0   # RSI → 0-1
        vec[3] = np.tanh(vec[3] / 5.0)    # MACD → -1 to 1
        if vec[4] > 0:  vec[4] /= 300.0   # BB upper → 0-1
        if vec[5] > 0:  vec[5] /= 300.0   # BB lower → 0-1
        if vec[6] > 0:  vec[6] /= 5000.0  # TPS → 0-1
        if vec[7] > 0:  vec[7] /= 50.0    # wallet → 0-1
        return torch.tensor(vec).unsqueeze(0)

    @property
    def n_samples(self) -> int:
        return len(self._scenarios)

    @staticmethod
    def _load(path: str | Path) -> List[Dict]:
        p = Path(path)
        if not p.exists():
            raise FileNotFoundError(f"Market data not found: {p}")
        with p.open("r", encoding="utf-8") as f:
            data = json.load(f)
        return [d for d in data if isinstance(d, dict) and "content" in d]

    @staticmethod
    def from_live_snapshot(
        price: float, volume: float, rsi: float, macd: float,
        bb_upper: float, bb_lower: float, sol_tps: float, wallet_balance: float,
        extra: Optional[List[float]] = None,
    ) -> torch.Tensor:
        """Build normalized state tensor from live market data."""
        vec = np.zeros(STATE_SIZE, dtype=np.float32)
        vec[0] = min(price / 300.0, 1.0)
        vec[1] = min(volume / 2e9, 1.0)
        vec[2] = rsi / 100.0
        vec[3] = np.tanh(macd / 5.0)
        vec[4] = min(bb_upper / 300.0, 1.0)
        vec[5] = min(bb_lower / 300.0, 1.0)
        vec[6] = min(sol_tps / 5000.0, 1.0)
        vec[7] = min(wallet_balance / 50.0, 1.0)
        if extra:
            for i, v in enumerate(extra[:STATE_SIZE - 8]):
                vec[8 + i] = float(v)
        return torch.tensor(vec).unsqueeze(0)
