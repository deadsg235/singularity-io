"""
Singularity Agent System
Intelligent trading bot agents for Singularity.io platform

Reverse-engineered from Dexter's multi-agent architecture
"""

__version__ = "0.1.0"
__author__ = "Singularity.io Team"

from .base_agent import (
    BaseAgent,
    AgentConfig,
    AgentStatus,
    AgentOrchestrator,
    MarketData,
    TradingDecision
)

from .neural_engine import (
    NeuralDecisionEngine,
    TradingQNetwork,
    TradingReplayBuffer
)

from .dca_agent import DCAAgent

from .agent_controller import AgentController

from .wallet_adapter import WalletAdapter, WalletInfo
from .sio_staking import SIOStaking, StakeInfo

__all__ = [
    # Base classes
    "BaseAgent",
    "AgentConfig",
    "AgentStatus",
    "AgentOrchestrator",
    "MarketData",
    "TradingDecision",
    
    # Neural engine
    "NeuralDecisionEngine",
    "TradingQNetwork",
    "TradingReplayBuffer",
    
    # Agents
    "DCAAgent",
    
    # Controller
    "AgentController",
    
    # Production components
    "WalletAdapter",
    "WalletInfo", 
    "SIOStaking",
    "StakeInfo",
]