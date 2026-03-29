"""
environment.py — Reasoning environment for DQN training on structured text/market data.

ReasoningEnvironment wraps a JSON dataset of {role, content} records into a
gym-compatible step/reset interface. The state is a fixed-length float vector
derived from the content text. Actions map to response categories.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import torch


class ReasoningEnvironment:
    """
    Text-based reasoning environment.

    State:  128-dim float vector (bag-of-words projection of content text)
    Action: integer index into the action vocabulary
    Reward: 1.0 if action matches expected category, 0.0 otherwise

    Args:
        data_path:    Path to JSON file containing list of {role, content} dicts.
        state_size:   Dimensionality of the state vector (default 128).
        action_size:  Number of discrete actions (default 10).
    """

    STATE_SIZE = 128

    def __init__(
        self,
        data_path: str | Path,
        state_size: int = 128,
        action_size: int = 10,
    ):
        self.state_size = state_size
        self.action_size = action_size
        self._data: List[Dict[str, str]] = self._load(data_path)
        self._vocab: Dict[str, int] = {}
        self._build_vocab()
        self._idx = 0

    # ── Gym-like interface ──────────────────────────────────────────────────

    def reset(self) -> torch.Tensor:
        self._idx = 0
        return self._encode(self._data[0]["content"])

    def step(self, action: int) -> Tuple[torch.Tensor, float, bool, Dict[str, Any]]:
        expected = self._idx % self.action_size
        reward = 1.0 if action == expected else 0.0
        self._idx += 1
        done = self._idx >= len(self._data)
        next_state = (
            self._encode(self._data[self._idx]["content"])
            if not done
            else torch.zeros(1, self.state_size)
        )
        return next_state, reward, done, {"index": self._idx}

    @property
    def n_samples(self) -> int:
        return len(self._data)

    # ── Encoding ────────────────────────────────────────────────────────────

    def _encode(self, text: str) -> torch.Tensor:
        """Project text into a fixed-size float vector via word-index lookup."""
        vec = np.zeros(self.state_size, dtype=np.float32)
        for i, word in enumerate(text.split()):
            if i >= self.state_size:
                break
            if word in self._vocab:
                vec[i] = float(self._vocab[word]) / max(len(self._vocab), 1)
        return torch.tensor(vec).unsqueeze(0)  # shape (1, state_size)

    def _build_vocab(self) -> None:
        words: set = set()
        for item in self._data:
            words.update(item.get("content", "").split())
        self._vocab = {w: i for i, w in enumerate(sorted(words))}

    # ── Data loading ────────────────────────────────────────────────────────

    @staticmethod
    def _load(path: str | Path) -> List[Dict[str, str]]:
        p = Path(path)
        if not p.exists():
            raise FileNotFoundError(f"Training data not found: {p}")
        with p.open("r", encoding="utf-8") as f:
            data = json.load(f)
        if not isinstance(data, list):
            raise ValueError("Training data must be a JSON array of objects.")
        return [d for d in data if isinstance(d, dict) and "content" in d]

    # ── Market data helpers (for live trading use) ──────────────────────────

    @staticmethod
    def from_market_snapshot(
        price: float,
        volume: float,
        rsi: float,
        macd: float,
        bb_upper: float,
        bb_lower: float,
        sol_tps: float,
        wallet_balance: float,
        extra: Optional[List[float]] = None,
    ) -> torch.Tensor:
        """
        Build a state tensor from live market data.
        Returns shape (1, 128) — padded with zeros beyond the provided features.
        """
        features = [
            price, volume, rsi, macd, bb_upper, bb_lower, sol_tps, wallet_balance
        ]
        if extra:
            features.extend(extra)
        vec = np.zeros(128, dtype=np.float32)
        for i, v in enumerate(features[:128]):
            vec[i] = float(v)
        return torch.tensor(vec).unsqueeze(0)
