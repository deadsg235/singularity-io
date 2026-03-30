# Singularity.io API

FastAPI backend deployed as Vercel serverless functions. Entry point: `api/index.py`.

## Stack

- **Framework**: FastAPI (Python 3.11+)
- **Validation**: Pydantic v2
- **AI**: Groq API — `llama-3.3-70b-versatile` (ULTIMA, trading assistant)
- **Blockchain**: Solana RPC via `solders` + `solana-py`
- **Auth**: Wallet signature verification (`X-Wallet-Signature` header)
- **Payments**: X402 protocol — HTTP 402 gating with on-chain verification

## Endpoints

### Health
| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/health` | — | Health check + version |

### Wallet
| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/wallet/{address}` | — | SOL + S-IO token balances |

### Swap
| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/swap/quote` | — | Jupiter v6 quote |
| POST | `/api/swap/execute` | Wallet sig | Execute swap transaction |

### Trading Bots
| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/bots` | Wallet sig | List user's bots with status |
| POST | `/api/bots` | Wallet sig | Create bot configuration |
| DELETE | `/api/bots/{id}` | Wallet sig | Stop and delete bot |
| GET | `/api/bots/signals` | **X402** | DQN trading signals |

### Guardian Analytics
| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/guardian/analyze/{address}` | — | Risk score + flagged txs + portfolio |
| GET | `/api/guardian/premium` | **X402** | Advanced analytics + MEV detection |

### Governance
| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/governance/proposals` | — | All proposals (active/passed/failed) |
| POST | `/api/governance/proposals` | Wallet sig | Create proposal |
| POST | `/api/governance/vote` | Wallet sig | Cast vote (yes/no/abstain) |

### Staking
| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/staking/{wallet}` | — | Staking position + pending rewards |
| POST | `/api/staking/stake` | Wallet sig | Stake S-IO tokens |
| POST | `/api/staking/unstake` | Wallet sig | Initiate unstake |
| POST | `/api/staking/claim` | Wallet sig | Claim rewards |

### Token Launchpad
| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/launchpad/create` | Wallet sig | Create SPL token + Arweave metadata |

### AI
| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/ai/query` | **X402** | ULTIMA AI query (SSE stream) |
| POST | `/api/ai/trading-assistant` | Wallet sig | Trading assistant chat |

### Analytics
| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/analytics/market` | — | SOL + top token market data |
| GET | `/api/analytics/leaderboard` | — | Trading performance rankings |

## Authentication

### Wallet Signature Auth
Protected endpoints require:
```
X-Wallet-Signature: <base58-encoded-signature>
X-Wallet-Address: <base58-public-key>
X-Nonce: <server-issued-nonce>
```

The server verifies the signature of the nonce using `solders`. Returns `401` if invalid.

### X402 Payment Auth
Premium endpoints return `402 Payment Required` without a valid `X-Payment` header:
```json
{
  "x402Version": 2,
  "accepts": [{
    "scheme": "exact",
    "network": "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
    "maxAmountRequired": "1000",
    "asset": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    "payTo": "<treasury-address>",
    "maxTimeoutSeconds": 300
  }]
}
```

## Data Models

### BotConfig
```python
class BotConfig(BaseModel):
    strategy: Literal["dca", "grid", "momentum", "arbitrage"]
    token_pair: str           # e.g. "SOL/USDC"
    position_size_sol: float
    stop_loss_pct: float      # 0–100
    take_profit_pct: float    # 0–100
    max_daily_trades: int
```

### GuardianAnalysis
```python
class GuardianAnalysis(BaseModel):
    wallet: str
    risk_score: float         # 0–100
    risk_label: str
    flagged_transactions: List[str]
    portfolio: List[PortfolioItem]
    historical_pnl: float
```

### GovernanceProposal
```python
class GovernanceProposal(BaseModel):
    id: str
    title: str
    description: str
    proposer: str
    yes_votes: float
    no_votes: float
    abstain_votes: float
    total_votes: float        # invariant: yes + no + abstain == total
    end_time: datetime
    status: Literal["active", "passed", "failed", "executed"]
```

## Error Responses

All errors return structured JSON:
```json
{
  "error": "MACHINE_READABLE_CODE",
  "message": "Human-readable description",
  "detail": null
}
```

| HTTP | Code | Condition |
|---|---|---|
| 401 | `UNAUTHORIZED` | Missing/invalid wallet signature |
| 402 | `PAYMENT_REQUIRED` | X402 payment required |
| 402 | `PAYMENT_VERIFICATION_FAILED` | Payment on-chain verification failed |
| 404 | `NOT_FOUND` | Resource not found |
| 422 | `VALIDATION_ERROR` | Invalid request body (Pydantic) |
| 429 | `RATE_LIMITED` | Too many requests |
| 502 | `RPC_ERROR` | Solana RPC error |
| 503 | `AI_SERVICE_UNAVAILABLE` | Groq API unavailable |

## Environment Variables

```bash
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
GROQ_API_KEY=gsk_...
ALLOWED_ORIGIN=https://singularity.io
X402_FACILITATOR_URL=https://...
X402_PRICE_AI_QUERY=0.001
X402_PRICE_GUARDIAN=0.0005
X402_PRICE_BOT_SIGNALS=0.002
MIN_PROPOSAL_TOKENS=10000
```

## Local Development

```bash
cd api
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

OpenAPI docs available at `http://localhost:8000/api/docs`.

## Deployment

Deployed as Vercel serverless functions via `api/index.py`:
```python
from mangum import Mangum
from main import app
handler = Mangum(app)
```

`vercel.json` routes `/api/*` to `api/index.py`.

## DQN Integration

The `DQNReasoningEngine` from `dqn-core/` is imported by:
- `bot_agent.py` — powers `/api/bots/signals`
- `guardian_analytics.py` — powers risk scoring in `/api/guardian/analyze`

```python
from dqn_core import DQNReasoningEngine

engine = DQNReasoningEngine(
    state_size=128,
    action_size=10,
    model_path="dqn-core/reasoning_dqn_model.pth",
    mode="trading"
)
```

Falls back to rule-based heuristics if checkpoint is unavailable (`dqn_available: false` in response).
