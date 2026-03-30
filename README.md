# Singularity.io

Singularity.io is a full-stack Solana DeFi platform combining AI-powered trading, on-chain analytics, X402 micro-payment gating, and the ULTIMA sentient AI terminal — all built on the `Jarvis_Revamp` branch and deployed via Vercel.

## Platform Overview

| Layer | Technology |
|---|---|
| Frontend | Vanilla JS/HTML/CSS → migrating to Next.js 14+ App Router |
| Backend | FastAPI (Python) deployed as Vercel serverless functions |
| AI Engine | 5-Layer DQN Reasoning Engine (`dqn-core/`) + Groq Llama 3.3 70B |
| Payments | X402 protocol (`@x402/core`, `@x402/svm`) — HTTP 402 micro-payments |
| Blockchain | Solana mainnet-beta / devnet via `@solana/web3.js` |
| Token | S-IO SPL token — `Fuj6EDWQHBnQ3eEvYDujNQ4rPLSkhm3pBySbQ79Bpump` |

---

## Core Features

### Solana Wallet Connection
Multi-wallet support (Phantom, Backpack, Solflare) via `@solana/wallet-adapter-react`. Live SOL + S-IO balance display, auto-refresh every 30 seconds, persistent connection across page navigations.

### Jupiter-Powered Token Swap (`/swap`)
Jupiter v6 Quote + Swap API integration. Real-time quotes with price impact warnings (>5% threshold), token selector modal with full Jupiter token list, streaming transaction confirmation toasts.

### AI Trading Bots (`/bots`, `/bot-launchpad`)
Configurable strategy bots (DCA, grid, momentum, arbitrage). Real-time P&L tracking, stop-loss auto-stop, community strategy template marketplace. Powered by DQN trading signals from `dqn-core/`.

### Guardian Analytics (`/guardian`, `/analytics`)
On-chain wallet risk scoring (0–100), transaction history pagination, portfolio breakdown with USD values, 3D network visualization (Three.js), real-time threat detection alerts. Works for any Solana address without wallet connection.

### X402 Payment Protocol (`/sio-payments`)
HTTP 402 payment-gated API routes for premium features. `ExactSvmPayloadV2` transactions signed via connected wallet, on-chain verification by the Facilitator, payment history persisted to localStorage.

### ULTIMA AI Terminal (`/ultima`)
Sentient AI research assistant powered by Groq Llama 3.3 70B with streaming SSE output. True wallet context — live SOL/S-IO balances injected into every system prompt. `/scan <address>` command for live on-chain wallet analysis. 5-layer DQN reasoning pipeline.

### Token Staking (`/staking`)
S-IO token staking with configurable APY, unbonding period, real-time reward accrual, and claim functionality.

### On-Chain Governance (`/governance`)
Proposal creation and voting (yes/no/abstain) with countdown timers, quorum enforcement, and minimum token balance requirements.

### Token Launchpad (`/token-launchpad`)
SPL token creation with Metaplex metadata upload to Arweave, optional Raydium liquidity bootstrapping.

### DQN Reasoning Engine (`dqn-core/`)
Standalone Python package. 5-layer `LayeredQNetwork` (128→256→256→128→128→actions), soft Polyak target updates, ONNX export for browser-side inference via `onnxruntime-web`.

---

## Project Structure

```
singularity-io/
├── api/                          # FastAPI backend (Vercel serverless)
│   ├── index.py                  # Vercel entry point
│   ├── main.py                   # App + router registration
│   ├── bot_agent.py              # Trading bot orchestration
│   ├── guardian_analytics.py     # Wallet risk scoring
│   ├── guardian_advanced.py      # Premium analytics (X402-gated)
│   ├── governance.py             # Proposal + voting
│   ├── groq_client.py            # Groq Llama 3.3 70B client
│   ├── langchain_agent.py        # LangChain agent integration
│   └── requirements.txt
├── dqn-core/                     # DQN Reasoning Engine
│   ├── engine.py                 # DQNReasoningEngine facade
│   ├── agent.py                  # DQNAgent (soft target updates)
│   ├── network.py                # LayeredQNetwork (5-layer)
│   ├── buffer.py                 # ReplayBuffer
│   ├── environment.py            # ReasoningEnvironment
│   ├── market_environment.py     # MarketEnvironment
│   ├── generate_market_data.py   # Training data generator
│   └── train_market_model.py     # Training pipeline
├── web/singularity-frontend/     # Frontend (vanilla JS, migrating to Next.js)
│   ├── index.html                # Homepage + ULTIMA modal
│   ├── analytics.html/js         # Market analytics + DQN signal
│   ├── ultima.html/js            # ULTIMA AI terminal (full-page)
│   ├── ultima-terminal.js        # ULTIMA modal (homepage)
│   ├── swap.html/js              # Jupiter swap
│   ├── staking.html/js           # S-IO staking
│   ├── governance.html/js        # On-chain governance
│   ├── guardian-*.html           # Guardian analytics
│   ├── bot.html/js               # Trading bots
│   ├── wallet-manager.js         # Unified wallet state
│   ├── wallet-balance-loader.js  # RPC balance fetcher
│   ├── groq-client.js            # Groq streaming client
│   ├── x402-client.js            # X402 payment client
│   ├── dqn-inference.js          # Browser ONNX inference
│   └── dqn_node_model.onnx       # Exported DQN model
├── typescript/                   # X402 SDK monorepo
│   └── packages/
│       ├── core/                 # @x402/core — types, Zod schemas
│       ├── http/next/            # @x402/next — Next.js middleware
│       └── http/paywall/         # @x402/paywall — payment UI
├── .kiro/specs/singularity-revamp/
│   ├── requirements.md           # Full feature requirements
│   ├── design.md                 # Architecture + correctness properties
│   └── tasks.md                  # Implementation task list
└── vercel.json                   # Deployment config
```

---

## Getting Started

### Backend
```bash
cd api
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd web/singularity-frontend
python -m http.server 8080
# open http://localhost:8080
```

### DQN Engine
```bash
cd dqn-core
pip install torch numpy
python generate_market_data.py   # generate training data
python train_market_model.py     # train the model
```

### Full Stack (Vercel)
```bash
vercel --prod
```

---

## API Endpoints

| Route | Auth | Description |
|---|---|---|
| `GET /api/health` | — | Health check |
| `GET /api/wallet/{address}` | — | SOL + token balances |
| `GET /api/swap/quote` | — | Jupiter quote |
| `POST /api/swap/execute` | Wallet sig | Execute swap |
| `GET /api/bots` | Wallet sig | List user bots |
| `POST /api/bots` | Wallet sig | Create bot |
| `GET /api/bots/signals` | X402 | DQN trading signals |
| `GET /api/guardian/analyze/{address}` | — | Risk score + portfolio |
| `GET /api/guardian/premium` | X402 | Advanced analytics |
| `GET /api/governance/proposals` | — | All proposals |
| `POST /api/governance/vote` | Wallet sig | Cast vote |
| `GET /api/staking/{wallet}` | — | Staking position |
| `POST /api/ai/query` | X402 | ULTIMA AI (SSE stream) |

---

## Environment Variables

```bash
NEXT_PUBLIC_SOLANA_NETWORK=mainnet-beta   # or devnet
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
GROQ_API_KEY=gsk_...
X402_FACILITATOR_URL=https://...
X402_PRICE_AI_QUERY=0.001
X402_PRICE_GUARDIAN=0.0005
X402_PRICE_BOT_SIGNALS=0.002
ALLOWED_ORIGIN=https://singularity.io
MIN_PROPOSAL_TOKENS=10000
```

---

## Roadmap

See [ROADMAP.md](ROADMAP.md) for the full Q1 2026 → Q2 2027 development plan.

## Documentation

- [ROADMAP.md](ROADMAP.md) — Quarterly milestones Q1 2026–Q2 2027
- [CHANGELOG.md](CHANGELOG.md) — Version history
- [SIO-PROTOCOL-README.md](SIO-PROTOCOL-README.md) — X402/S-IO payment protocol
- [api/README.md](api/README.md) — Backend API reference
- [web/singularity-frontend/README.md](web/singularity-frontend/README.md) — Frontend guide
- [singularity-agent/README.md](singularity-agent/README.md) — Trading agent system
- [.kiro/specs/singularity-revamp/requirements.md](.kiro/specs/singularity-revamp/requirements.md) — Feature requirements
- [.kiro/specs/singularity-revamp/design.md](.kiro/specs/singularity-revamp/design.md) — System design

## License

MIT
