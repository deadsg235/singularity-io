"""
tests/test_engine.py — Unit tests for the DQN reasoning engine.

Run with:  python -m pytest dqn-core/tests/ -v
"""

import json
import tempfile
from pathlib import Path

import pytest
import torch

from dqn_core import DQNReasoningEngine, DQNAgent, QNetwork, LayeredQNetwork, ReplayBuffer, ReasoningEnvironment


# ── Fixtures ────────────────────────────────────────────────────────────────

@pytest.fixture
def tmp_data(tmp_path: Path) -> Path:
    """Write a minimal training_data.json for environment tests."""
    data = [{"role": "system", "content": f"token{i} action{i} market{i}"} for i in range(20)]
    p = tmp_path / "training_data.json"
    p.write_text(json.dumps(data))
    return p


@pytest.fixture
def engine() -> DQNReasoningEngine:
    return DQNReasoningEngine(state_size=128, action_size=10, mode="trading")


# ── Network tests ────────────────────────────────────────────────────────────

def test_q_network_output_shape():
    net = QNetwork(state_size=128, action_size=10)
    x = torch.randn(4, 128)
    out = net(x)
    assert out.shape == (4, 10)


def test_layered_q_network_output_shape():
    net = LayeredQNetwork(state_size=128, action_size=10)
    x = torch.randn(4, 128)
    out = net(x)
    assert out.shape == (4, 10)


def test_layered_q_network_five_layers():
    """Verify the 5-layer architecture has the expected parameter count."""
    net = LayeredQNetwork(state_size=128, action_size=10)
    linear_layers = [m for m in net.modules() if isinstance(m, torch.nn.Linear)]
    assert len(linear_layers) == 5, f"Expected 5 Linear layers, got {len(linear_layers)}"


# ── Buffer tests ─────────────────────────────────────────────────────────────

def test_replay_buffer_push_and_sample():
    buf = ReplayBuffer(capacity=100)
    for _ in range(70):
        s = torch.randn(1, 128)
        buf.push(s, 0, 1.0, s, False)
    assert len(buf) == 70
    states, actions, rewards, next_states, dones = buf.sample(32)
    assert states.shape == (32, 128)
    assert actions.shape == (32, 1)


def test_replay_buffer_is_ready():
    buf = ReplayBuffer(capacity=100)
    assert not buf.is_ready
    for _ in range(64):
        buf.push(torch.randn(1, 128), 0, 0.0, torch.randn(1, 128), False)
    assert buf.is_ready


# ── Agent tests ──────────────────────────────────────────────────────────────

def test_agent_act_returns_valid_action():
    agent = DQNAgent(state_size=128, action_size=10)
    state = torch.randn(1, 128)
    action = agent.act(state, epsilon=0.0)
    assert 0 <= action < 10


def test_agent_step_returns_loss_after_warmup():
    agent = DQNAgent(state_size=128, action_size=10, batch_size=8, buffer_size=100)
    state = torch.randn(1, 128)
    loss = None
    for _ in range(10):
        loss = agent.step(state, 0, 1.0, state, False)
    assert loss is not None
    assert loss >= 0.0


def test_agent_save_load(tmp_path: Path):
    agent = DQNAgent(state_size=128, action_size=10)
    path = str(tmp_path / "ckpt.pth")
    agent.save(path)
    agent2 = DQNAgent(state_size=128, action_size=10)
    agent2.load(path)
    # Weights should match
    for p1, p2 in zip(agent.online_net.parameters(), agent2.online_net.parameters()):
        assert torch.allclose(p1, p2)


# ── Environment tests ────────────────────────────────────────────────────────

def test_environment_reset_shape(tmp_data: Path):
    env = ReasoningEnvironment(tmp_data, state_size=128, action_size=10)
    state = env.reset()
    assert state.shape == (1, 128)


def test_environment_step(tmp_data: Path):
    env = ReasoningEnvironment(tmp_data, state_size=128, action_size=10)
    state = env.reset()
    next_state, reward, done, info = env.step(0)
    assert next_state.shape == (1, 128)
    assert reward in (0.0, 1.0)
    assert isinstance(done, bool)


def test_environment_from_market_snapshot():
    state = ReasoningEnvironment.from_market_snapshot(
        price=150.0, volume=1_000_000.0, rsi=55.0, macd=0.5,
        bb_upper=155.0, bb_lower=145.0, sol_tps=3200.0, wallet_balance=10.5,
    )
    assert state.shape == (1, 128)
    assert float(state[0, 0]) == 150.0


# ── Engine tests ─────────────────────────────────────────────────────────────

def test_engine_infer_trading_action(engine: DQNReasoningEngine):
    result = engine.infer_trading_action(
        price=150.0, volume=1_000_000.0, rsi=55.0, macd=0.5,
        bb_upper=155.0, bb_lower=145.0, sol_tps=3200.0, wallet_balance=10.5,
    )
    assert "action_index" in result
    assert "action_label" in result
    assert "q_values" in result
    assert "confidence" in result
    assert 0 <= result["action_index"] < 10
    assert 0.0 <= result["confidence"] <= 1.0


def test_engine_infer_risk_score():
    engine = DQNReasoningEngine(state_size=128, action_size=10, mode="risk")
    features = [0.8, 0.2, 0.5, 0.1, 0.9, 0.3]
    result = engine.infer_risk_score(features)
    assert "risk_index" in result
    assert "risk_label" in result
    assert "risk_score" in result
    assert 0.0 <= result["risk_score"] <= 100.0


def test_engine_train_episode(engine: DQNReasoningEngine, tmp_data: Path):
    env = ReasoningEnvironment(tmp_data, state_size=128, action_size=10)
    metrics = engine.train_episode(env, epsilon=1.0)
    assert "total_reward" in metrics
    assert "steps" in metrics
    assert metrics["steps"] > 0


def test_engine_round_trip_save_load(engine: DQNReasoningEngine, tmp_path: Path):
    """Property: save then load produces identical inference results."""
    path = str(tmp_path / "engine.pth")
    state = torch.randn(1, 128)
    engine.agent.online_net.eval()
    with torch.no_grad():
        q_before = engine.agent.online_net(state).tolist()

    engine.save(path)
    engine2 = DQNReasoningEngine(state_size=128, action_size=10, model_path=path)
    engine2.agent.online_net.eval()
    with torch.no_grad():
        q_after = engine2.agent.online_net(state).tolist()

    assert q_before == q_after, "Q-values changed after save/load round-trip"
