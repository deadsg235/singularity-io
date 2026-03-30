# Singularity Agent System

AI trading bot agents for the Singularity.io platform, powered by the 5-Layer DQN Reasoning Engine.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│  Agent Controller (bot_agent.py)                    │
│  ├── Strategy Router                                │
│  ├── Risk Manager                                   │
│  └── Trade Executor (Jupiter v6)                   │
├─────────────────────────────────────────────────────┤
│  DQN Reasoning Engine (dqn-core/)                  │
│  ├── LayeredQNetwork (5-layer)                      │
│  ├── ReasoningEnvironment                           │
│  └── DQNReasoningEngine.infer_trading_action()     │
├─────────────────────────────────────────────────────┤
│  Solana Integration                                 │
│  ├── Jupiter v6 Quote + Swap API                   │
│  ├── RPC client (rpc_client.py)                    │
│  └── Wallet signature verification                 │
└─────────────────────────────────────────────────────┘
```

## Agent Types

### DCA Agent
Dollar-cost averaging into a target token at configurable intervals. Uses DQN confidence score to adjust position size — higher confidence = larger buy.

### Grid Agent
Places buy/sell orders at fixed price intervals around a base price. DQN signal determines grid width and rebalancing frequency.

### Momentum Agent
Trend-following strategy. Enters long when DQN outputs `BUY`/`STRONG_BUY` with confidence > 0.75, exits on `SELL`/`STRONG_SELL` or stop-loss breach.

### Arbitrage Agent
Monitors price discrepancies across Solana DEXes via Jupiter routing. Executes when spread exceeds gas + slippage costs.

## DQN Actions

The `LayeredQNetwork` outputs Q-values for 10 actions:

| Index | Action | Description |
|---|---|---|
| 0 | `STRONG_BUY` | Maximum position entry |
| 1 | `BUY` | Standard buy |
| 2 | `WEAK_BUY` | Small buy / scale in |
| 3 | `HOLD` | No action |
| 4 | `WEAK_SELL` | Small sell / scale out |
| 5 | `SELL` | Standard sell |
| 6 | `STRONG_SELL` | Full position exit |
| 7 | `INCREASE_POSITION` | Add to existing position |
| 8 | `REDUCE_POSITION` | Partial exit |
| 9 | `EXIT` | Emergency exit |

## Bot Configuration

```python
BotConfig(
    strategy="momentum",
    token_pair="SOL/USDC",
    position_size_sol=0.5,
    stop_loss_pct=5.0,       # auto-stop if loss >= 5%
    take_profit_pct=15.0,
    max_daily_trades=10
)
```

## Risk Management

- **Stop-loss**: Bot auto-stops when P&L loss % ≥ `stop_loss_pct`. No further trades executed.
- **Max daily trades**: Hard cap on trade count per 24h window.
- **Position sizing**: DQN confidence score scales position size (low confidence → smaller position).
- **Slippage protection**: Jupiter quote `otherAmountThreshold` enforced on all swaps.

## API Endpoints

| Method | Route | Description |
|---|---|---|
| GET | `/api/bots` | List user's bots with current status |
| POST | `/api/bots` | Create and deploy a bot |
| DELETE | `/api/bots/{id}` | Stop bot, close position within 60s |
| GET | `/api/bots/signals` | DQN trading signals (X402-gated) |

## Trade Logging

Every executed trade is logged:
```python
TradeLog(
    timestamp=datetime.utcnow(),
    token_pair="SOL/USDC",
    direction="buy",
    amount=0.5,
    price=185.42,
    tx_signature="5j7k8l9m..."
)
```

## Bot Launchpad

Community strategy templates are browsable at `/bot-launchpad`. Users can:
- Browse templates by strategy type and 30d performance
- Clone a template into their own bot configuration
- Publish their own strategies (requires minimum S-IO stake)

## Getting Started

```bash
# Install dependencies
cd api
pip install -r requirements.txt

# Start API server
uvicorn main:app --reload --port 8000

# Create a bot via API
curl -X POST http://localhost:8000/api/bots \
  -H "Content-Type: application/json" \
  -H "X-Wallet-Signature: <sig>" \
  -H "X-Wallet-Address: <pubkey>" \
  -d '{
    "strategy": "momentum",
    "token_pair": "SOL/USDC",
    "position_size_sol": 0.1,
    "stop_loss_pct": 5,
    "take_profit_pct": 15,
    "max_daily_trades": 5
  }'
```

## Roadmap

### Q1 2026 (current)
- [x] Bot configuration API (`/api/bots`)
- [x] DQN signal endpoint (`/api/bots/signals`)
- [x] Trade logging
- [ ] Live Jupiter v6 swap execution from bot engine
- [ ] Stop-loss auto-stop enforcement

### Q2 2026
- [ ] Real-time P&L via WebSocket/SSE
- [ ] Multi-bot portfolio risk management
- [ ] Backtesting against historical on-chain data

### Q1 2027
- [ ] Multi-bot coordination
- [ ] Telegram/Discord alert integration
- [ ] Community leaderboard by 30d ROI
- [ ] Strategy publishing with S-IO stake requirement
