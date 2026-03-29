"""
buffer.py — Experience replay buffer for DQN training.
"""

import random
from collections import deque
from typing import List, Tuple

import torch


class ReplayBuffer:
    """
    Fixed-size circular replay buffer storing (s, a, r, s', done) transitions.

    Args:
        capacity: Maximum number of transitions to store.
    """

    def __init__(self, capacity: int = 10_000):
        self._buffer: deque = deque(maxlen=capacity)

    def push(
        self,
        state: torch.Tensor,
        action: int,
        reward: float,
        next_state: torch.Tensor,
        done: bool,
    ) -> None:
        self._buffer.append((state, action, reward, next_state, done))

    def sample(self, batch_size: int) -> Tuple[torch.Tensor, ...]:
        """Return a random batch as stacked tensors."""
        batch = random.sample(self._buffer, batch_size)
        states, actions, rewards, next_states, dones = zip(*batch)

        return (
            torch.cat(states),
            torch.tensor(actions, dtype=torch.int64).unsqueeze(1),
            torch.tensor(rewards, dtype=torch.float32).unsqueeze(1),
            torch.cat(next_states),
            torch.tensor(dones, dtype=torch.float32).unsqueeze(1),
        )

    def __len__(self) -> int:
        return len(self._buffer)

    @property
    def is_ready(self) -> bool:
        return len(self._buffer) >= 64
