"""
dqn-core — 5-Layer Deep Q-Network Reasoning Engine
Singularity.io AI backbone for trading decisions, market analysis, and ULTIMA terminal.

Imports are lazy so that environments without torch (e.g. Vercel serverless)
can still import this package without errors. torch is only loaded when
DQNReasoningEngine is actually instantiated.

Usage:
    from dqn_core import DQNReasoningEngine
    from dqn_core import DQNAgent, LayeredQNetwork, ReplayBuffer, ReasoningEnvironment
"""

from __future__ import annotations

__version__ = "2.0.0"

__all__ = [
    "DQNReasoningEngine",
    "QNetwork",
    "LayeredQNetwork",
    "DQNAgent",
    "ReplayBuffer",
    "ReasoningEnvironment",
    "MarketEnvironment",
]


def __getattr__(name: str):
    """Lazy import — only load torch-dependent modules when first accessed."""
    _map = {
        "DQNReasoningEngine": (".engine",       "DQNReasoningEngine"),
        "QNetwork":           (".network",      "QNetwork"),
        "LayeredQNetwork":    (".network",      "LayeredQNetwork"),
        "DQNAgent":           (".agent",        "DQNAgent"),
        "ReplayBuffer":       (".buffer",       "ReplayBuffer"),
        "ReasoningEnvironment": (".environment","ReasoningEnvironment"),
        "MarketEnvironment":  (".market_environment", "MarketEnvironment"),
    }
    if name in _map:
        module_path, attr = _map[name]
        import importlib
        mod = importlib.import_module(module_path, package=__name__)
        return getattr(mod, attr)
    raise AttributeError(f"module 'dqn_core' has no attribute {name!r}")
