# Singularity Agent Deployment Guide

## Quick Start

### 1. Install Dependencies
```bash
cd singularity-agent
pip install -r requirements.txt
```

### 2. Deploy a DCA Agent
```bash
python -m agent_controller --strategy dca --name "sol_dca_bot" --tokens SOL --amount 100 --interval 3600 --neural
```

### 3. Monitor Agent
The agent will start automatically and provide status updates every 10 seconds.

## Detailed Configuration

### DCA Agent Configuration

```python
from singularity_agent import AgentController

controller = AgentController()
await controller.initialize()

# Deploy DCA agent
agent_id = await controller.deploy_dca_agent(
    name="my_dca_bot",
    tokens=["SOL", "BTC", "ETH"],  # Target tokens
    dca_amount=100.0,              # $100 per purchase
    interval_seconds=3600,         # Every hour
    max_position_size=10000.0,     # Max $10k position
    enable_neural=True             # Use neural decision engine
)
```

### Neural Engine Configuration

The neural decision engine uses a Deep Q-Network (DQN) to make intelligent trading decisions:

- **State Features**: Price, volume, technical indicators, portfolio state
- **Actions**: STRONG_BUY, BUY, HOLD, SELL, STRONG_SELL
- **Learning**: Experience replay with target network updates

### Solana Integration

```python
from singularity_agent import SolanaClient, SolanaTradeExecutor

# Initialize Solana client
async with SolanaClient() as client:
    # Get wallet info
    wallet = await client.get_wallet_info("your_wallet_address")
    
    # Execute trade
    executor = SolanaTradeExecutor(client)
    order = await executor.execute_dca_purchase(
        wallet_address="your_wallet_address",
        target_token="SOL",
        usd_amount=100.0,
        max_slippage=0.02
    )
```

## Agent Types

### 1. DCA Agent
- **Purpose**: Dollar Cost Averaging strategy
- **Features**: 
  - Scheduled purchases at regular intervals
  - Neural network override for market timing
  - Risk management and slippage protection
  - Multi-token support

### 2. Arbitrage Agent (Coming Soon)
- **Purpose**: Cross-exchange arbitrage opportunities
- **Features**:
  - Real-time price monitoring across exchanges
  - Automated arbitrage execution
  - Risk-adjusted profit calculations

### 3. Grid Agent (Coming Soon)
- **Purpose**: Grid trading strategies
- **Features**:
  - Dynamic grid level adjustment
  - Profit taking at resistance levels
  - Support/resistance detection

### 4. Momentum Agent (Coming Soon)
- **Purpose**: Trend following strategies
- **Features**:
  - Technical indicator analysis
  - Momentum detection algorithms
  - Dynamic position sizing

## Risk Management

All agents include built-in risk management:

- **Position Size Limits**: Maximum position size per token
- **Slippage Protection**: Maximum allowed slippage
- **Stop Loss**: Automatic stop loss triggers
- **Volatility Checks**: Pause trading during high volatility
- **Portfolio Exposure**: Overall risk exposure monitoring

## Monitoring and Analytics

### Agent Status
```python
# Get individual agent status
status = await controller.get_agent_status("my_dca_bot")
print(f"Status: {status['status']}")
print(f"Total Trades: {status['performance']['total_trades']}")
print(f"Win Rate: {status['performance']['win_rate']:.2%}")

# Get all agents status
all_status = await controller.get_all_agents_status()
```

### Performance Metrics
- Total trades executed
- Success rate
- Profit/Loss tracking
- Risk-adjusted returns
- Sharpe ratio calculation

## Integration with Singularity.io

### Bot Launcher Integration
The agent system integrates with the Singularity.io bot launcher:

```javascript
// Frontend integration
const deployBot = async (config) => {
    const response = await fetch('/api/agents/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            strategy: 'dca',
            name: config.name,
            tokens: config.tokens,
            amount: config.amount,
            interval: config.interval,
            neural: config.enableNeural
        })
    });
    
    return await response.json();
};
```

### API Endpoints
- `POST /api/agents/deploy` - Deploy new agent
- `GET /api/agents/{id}/status` - Get agent status
- `POST /api/agents/{id}/pause` - Pause agent
- `POST /api/agents/{id}/resume` - Resume agent
- `DELETE /api/agents/{id}` - Stop and remove agent

## Advanced Features

### Neural Network Training
```python
# Train neural model on historical data
from singularity_agent import NeuralDecisionEngine

engine = NeuralDecisionEngine()
await engine.train_on_historical_data(
    data_path="historical_data.json",
    epochs=1000,
    validation_split=0.2
)
await engine.save_model("models/trained_dca_model.pth")
```

### Custom Strategies
```python
from singularity_agent import BaseAgent

class CustomAgent(BaseAgent):
    async def analyze_market(self, market_data):
        # Implement custom strategy logic
        return TradingDecision(
            action="BUY",
            amount=100.0,
            confidence=0.8,
            reason="Custom strategy signal",
            risk_score=0.3
        )
    
    async def execute_trade(self, decision):
        # Implement custom execution logic
        return True
```

## Security Considerations

- **Private Keys**: Never store private keys in code
- **API Keys**: Use environment variables for sensitive data
- **Wallet Permissions**: Use dedicated trading wallets with limited funds
- **Network Security**: Use secure RPC endpoints
- **Monitoring**: Set up alerts for unusual activity

## Troubleshooting

### Common Issues

1. **Agent Not Starting**
   - Check wallet address format
   - Verify RPC endpoint connectivity
   - Ensure sufficient balance for trades

2. **Neural Engine Errors**
   - Verify model file exists
   - Check PyTorch installation
   - Validate input data format

3. **Trade Execution Failures**
   - Check slippage settings
   - Verify token addresses
   - Monitor network congestion

### Logs
```bash
# View agent logs
tail -f logs/agent_controller.log
tail -f logs/dca_agent.log
tail -f logs/neural_engine.log
```

## Support

For issues and questions:
- GitHub Issues: [singularity-io/agents](https://github.com/singularity-io/agents)
- Discord: [Singularity.io Community](https://discord.gg/singularity)
- Documentation: [docs.singularity.io](https://docs.singularity.io)