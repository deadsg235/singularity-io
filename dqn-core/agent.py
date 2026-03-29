"""
agent.py — DQN agent with soft target-network updates and epsilon-greedy exploration.
"""

from __future__ import annotations

import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim

from .buffer import ReplayBuffer
from .network import LayeredQNetwork


class DQNAgent:
    """
    5-layer DQN agent.

    Uses:
    - LayeredQNetwork for both online and target networks
    - Soft target-network updates (Polyak averaging, tau)
    - Epsilon-greedy action selection
    - MSE TD-error loss

    Args:
        state_size:   Dimensionality of the state vector.
        action_size:  Number of discrete actions.
        lr:           Adam learning rate.
        gamma:        Discount factor.
        tau:          Soft update coefficient (0 < tau << 1).
        buffer_size:  Replay buffer capacity.
        batch_size:   Training batch size.
        dropout:      Dropout rate in LayeredQNetwork.
    """

    def __init__(
        self,
        state_size: int,
        action_size: int,
        lr: float = 1e-3,
        gamma: float = 0.99,
        tau: float = 1e-3,
        buffer_size: int = 10_000,
        batch_size: int = 64,
        dropout: float = 0.1,
    ):
        self.state_size = state_size
        self.action_size = action_size
        self.gamma = gamma
        self.tau = tau
        self.batch_size = batch_size

        self.online_net = LayeredQNetwork(state_size, action_size, dropout)
        self.target_net = LayeredQNetwork(state_size, action_size, dropout)
        self.target_net.load_state_dict(self.online_net.state_dict())
        self.target_net.eval()

        self.optimizer = optim.Adam(self.online_net.parameters(), lr=lr)
        self.buffer = ReplayBuffer(buffer_size)

    # ── Action selection ────────────────────────────────────────────────────

    def act(self, state: torch.Tensor, epsilon: float = 0.0) -> int:
        """Epsilon-greedy action selection."""
        if np.random.rand() < epsilon:
            return int(np.random.randint(self.action_size))
        self.online_net.eval()
        with torch.no_grad():
            q = self.online_net(state)
        self.online_net.train()
        return int(torch.argmax(q).item())

    # ── Learning step ───────────────────────────────────────────────────────

    def step(
        self,
        state: torch.Tensor,
        action: int,
        reward: float,
        next_state: torch.Tensor,
        done: bool,
    ) -> float | None:
        """Store transition and optionally train. Returns loss or None."""
        self.buffer.push(state, action, reward, next_state, done)
        if not self.buffer.is_ready:
            return None
        return self._learn()

    def _learn(self) -> float:
        states, actions, rewards, next_states, dones = self.buffer.sample(self.batch_size)

        # Current Q-values
        q_values = self.online_net(states).gather(1, actions)

        # Target Q-values (Bellman)
        with torch.no_grad():
            next_q = self.target_net(next_states).max(dim=1, keepdim=True).values
            targets = rewards + self.gamma * (1.0 - dones) * next_q

        loss = nn.MSELoss()(q_values, targets)
        self.optimizer.zero_grad()
        loss.backward()
        nn.utils.clip_grad_norm_(self.online_net.parameters(), max_norm=1.0)
        self.optimizer.step()

        self._soft_update()
        return float(loss.item())

    def _soft_update(self) -> None:
        for tp, op in zip(self.target_net.parameters(), self.online_net.parameters()):
            tp.data.copy_(self.tau * op.data + (1.0 - self.tau) * tp.data)

    # ── Persistence ─────────────────────────────────────────────────────────

    def save(self, path: str) -> None:
        torch.save(
            {
                "online": self.online_net.state_dict(),
                "target": self.target_net.state_dict(),
                "optimizer": self.optimizer.state_dict(),
            },
            path,
        )

    def load(self, path: str) -> None:
        ckpt = torch.load(path, map_location="cpu")
        self.online_net.load_state_dict(ckpt["online"])
        self.target_net.load_state_dict(ckpt["target"])
        if "optimizer" in ckpt:
            self.optimizer.load_state_dict(ckpt["optimizer"])
