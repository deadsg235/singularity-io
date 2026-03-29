"""
network.py — Q-Network architectures for the DQN reasoning engine.

QNetwork:       Shallow 3-layer network (state → 64 → 64 → actions)
LayeredQNetwork: 5-layer deep network used by the JARVIS reasoning engine
"""

import torch
import torch.nn as nn


class QNetwork(nn.Module):
    """Standard 3-layer Q-network for fast inference."""

    def __init__(self, state_size: int, action_size: int):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(state_size, 64),
            nn.ReLU(),
            nn.Linear(64, 64),
            nn.ReLU(),
            nn.Linear(64, action_size),
        )

    def forward(self, state: torch.Tensor) -> torch.Tensor:
        return self.net(state)


class LayeredQNetwork(nn.Module):
    """
    5-layer deep Q-network — the core reasoning architecture.

    Layer structure:
      1. Input projection    (state_size → 256)
      2. Reasoning layer 1   (256 → 256)
      3. Reasoning layer 2   (256 → 128)
      4. Reasoning layer 3   (128 → 128)
      5. Output projection   (128 → action_size)

    Batch normalization and dropout applied between layers for stability.
    """

    def __init__(self, state_size: int, action_size: int, dropout: float = 0.1):
        super().__init__()
        self.net = nn.Sequential(
            # Layer 1 — input projection
            nn.Linear(state_size, 256),
            nn.LayerNorm(256),
            nn.ReLU(),
            nn.Dropout(dropout),
            # Layer 2 — reasoning
            nn.Linear(256, 256),
            nn.LayerNorm(256),
            nn.ReLU(),
            nn.Dropout(dropout),
            # Layer 3 — compression
            nn.Linear(256, 128),
            nn.LayerNorm(128),
            nn.ReLU(),
            nn.Dropout(dropout),
            # Layer 4 — deep reasoning
            nn.Linear(128, 128),
            nn.LayerNorm(128),
            nn.ReLU(),
            # Layer 5 — output
            nn.Linear(128, action_size),
        )

    def forward(self, state: torch.Tensor) -> torch.Tensor:
        return self.net(state)
