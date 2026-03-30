"""
dqn-core — 5-Layer Deep Q-Network Reasoning Engine
Singularity.io AI backbone for trading decisions, market analysis, and ULTIMA terminal.

Import as:
    from dqn_core import DQNReasoningEngine
    from dqn_core import DQNAgent, LayeredQNetwork, ReplayBuffer, ReasoningEnvironment
"""

from .engine import DQNReasoningEngine
from .network import QNetwork, LayeredQNetwork
from .agent import DQNAgent
from .buffer import ReplayBuffer
from .environment import ReasoningEnvironment
from .market_environment import MarketEnvironment

__all__ = [
    "DQNReasoningEngine",
    "QNetwork",
    "LayeredQNetwork",
    "DQNAgent",
    "ReplayBuffer",
    "ReasoningEnvironment",
    "MarketEnvironment",
]

__version__ = "2.0.0"
