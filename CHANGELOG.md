# Changelog — Singularity.io

---

## v0.6.0 — Wallet Context & Analytics Charts (2026-03-29)

### Fixed
- **Analytics charts** — `analytics.js` had corrupted template literals causing a syntax error on load; all four Chart.js instances (SOL price, S-IO price, volume, buy/sell) now initialize and render correctly
- **ULTIMA wallet context** — ULTIMA terminal and modal now read wallet state from `walletManager` (single source of truth) instead of isolated local variables that were never updated
- **`window.globalWallet` alias** — `wallet-manager.js` now defines a live computed `window.globalWallet` getter so `ultima-terminal.js` and other components that read it get the actual connected wallet
- **`localStorage.walletAddress`** — `wallet-manager.js` now writes/clears this key on connect/disconnect so `trading-assistant.js` and other pages that read it work correctly

### Added
- **ULTIMA `/scan <address>`** — new command that makes live Solana RPC calls to fetch SOL balance, S-IO token balance, and last 3 transaction signatures for any address
- **ULTIMA wallet status bar** — injected into the ULTIMA page header showing connected address + live SOL/S-IO balances
- **ULTIMA live balance injection** — every Groq system prompt now includes the connected wallet's actual SOL and S-IO balances from `_cachedBalances`
- **`walletConnected` / `walletDisconnected` CustomEvents** — fired by `wallet-manager.js` on state changes; ULTIMA listens and updates its context immediately
- **Analytics DQN signal panel** — Q-value bar chart with action label, confidence, and source indicator

### Changed
- `wallet-manager.js` `connect()` now dispatches `walletConnected` CustomEvent in addition to the internal emitter
- `wallet-manager.js` `disconnect()` now dispatches `walletDisconnected` CustomEvent
- `ultima-terminal.js` `getContext()` reads from `walletManager` first, falls back to `globalWallet`
- `ultima-terminal.js` `getSystemPrompt()` injects live SOL + S-IO balances into system prompt
- `ultima-terminal.js` `getWalletInfo()` calls `loadWalletBalances()` to refresh before reporting

---

## v0.5.0 — DQN Engine & Spec Foundation (2026-03)

### Added
- **DQN Reasoning Engine** (`dqn-core/`) — standalone Python package
  - `generate_market_data.py` — synthetic market data generator (OHLCV + indicators)
  - `train_market_model.py` — training pipeline with episode loop
  - `market_environment.py` — `MarketEnvironment` with numeric state encoding
- **Spec documents** — `.kiro/specs/singularity-revamp/`
  - `requirements.md` — 14 requirements, 70+ acceptance criteria
  - `design.md` — full architecture, 26 correctness properties, testing strategy

### Changed
- `dqn-inference.js` — browser ONNX inference with `onnxruntime-web`, RSI-based fallback
- `x402-client.js` — full X402 `ExactSvmPayloadV2` payment flow with Phantom signing

---

## v0.4.0 — X402 Payment Protocol (2026-02)

### Added
- **X402 client** (`web/singularity-frontend/x402-client.js`)
  - `x402Pay()` — full payment flow: build requirements → sign → send → confirm → persist
  - `x402IsUnlocked()` / `x402GetUnlocked()` — service unlock state from localStorage
  - SPL `TransferChecked` instruction builder
  - RPC pool with round-robin fallback
- **X402 demo page** (`x402-demo.html`) — interactive payment flow demonstration
- **S-IO payments page** (`sio-payments.html`) — transaction history from localStorage

---

## v0.3.0 — Full DeFi Feature Set (2026-01)

### Added
- **Jupiter swap** (`swap.html/js`) — v6 Quote + Swap API, token selector, price impact warning
- **Guardian analytics** (`guardian-*.html/js`) — risk scoring, transaction history, portfolio breakdown
- **Trading bots** (`bot.html/js`, `bot-launchpad.html/js`) — strategy configuration, P&L tracking
- **Token staking** (`staking.html/js`) — stake/unstake/claim with localStorage persistence
- **On-chain governance** (`governance.html/js`) — proposals, voting, countdown timers
- **Token launchpad** (`token-launchpad.html/js`) — SPL token creation form
- **ULTIMA terminal** (`ultima.html/js`, `ultima-terminal.js`) — Groq Llama 3.3 70B, 5-layer DQN pipeline
- **Trading assistant** (`trading-assistant.html/js`) — Groq-powered chat with DQN signal
- **Groq client** (`groq-client.js`) — streaming SSE chat completions
- **Wallet stack** (`wallet-manager.js`, `wallet-balance-loader.js`, `sio-wallet-adapter.js`) — unified wallet state, RPC balance fetching with fallback pool
- **3D network visualization** (`network3d.html/js`) — Three.js wallet connection graph
- **Portfolio page** (`portfolio.html/js`) — token holdings with USD values
- **Leaderboard** (`leaderboard.html/js`) — trading performance rankings
- **Social feed** (`social.html/js`) — on-chain activity stream
- **Analytics** (`analytics.html/js`) — Chart.js market charts, DQN signal panel

### Backend (`api/`)
- `bot_agent.py` — bot orchestration + trade logging
- `guardian_analytics.py` — wallet risk scoring
- `guardian_advanced.py` — premium analytics (X402-gated)
- `governance.py` — proposal + vote endpoints
- `groq_client.py` — Groq API integration
- `langchain_agent.py` — LangChain agent for complex queries
- `analytics.py` — market data aggregation
- `revenue.py` — platform revenue tracking
- `leaderboard.py` — performance rankings
- `portfolio.py` — portfolio aggregation
- `network.py` — Solana network stats
- `access_control.py` — wallet signature verification

---

## v0.2.0 — Neural Network & Wallet Integration

### Added
- Deep Q-Network canvas visualization (8→16→16→8 nodes)
- Phantom wallet connection (one-click, address display)
- `GET /api/neural/network` + `POST /api/neural/update` endpoints
- FEATURES.md, QUICKSTART.md, demo.html

---

## v0.1.0 — Base Template

### Added
- FastAPI backend with Solana endpoints
- Modern landing page
- Vercel deployment configuration
- Solana client foundation
- Health monitoring, CORS configuration

---

## Upcoming

See [ROADMAP.md](ROADMAP.md) for the full Q1 2026 → Q2 2027 plan.
