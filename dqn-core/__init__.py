"""
dqn-core — 5-Layer Deep Q-Network Reasoning Engine
Singularity.io AI backbone for trading decisions, market analysis, and ULTIMA terminal.
"""

from .engine import DQNReasoningEngine
from .network import QNetwork, LayeredQNetwork
from .agent import DQNAgent
from .buffer import ReplayBuffer
from .environment import ReasoningEnvironment

__all__ = [
    "DQNReasoningEngine",
    "QNetwork",
    "LayeredQNetwork",
    "DQNAgent",
    "ReplayBuffer",
    "ReasoningEnvironment",
]

__version__ = "2.0.0"
