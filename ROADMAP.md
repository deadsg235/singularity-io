# Singularity.io — Development Roadmap
## Q1 2026 → Q2 2027

---

## Q1 2026 — Foundation Hardening (Jan–Mar 2026)
*Branch: `Jarvis_Revamp` → merge to `main`*

### Frontend
- [x] Analytics page charts (SOL price, S-IO price, volume, buy/sell) — Chart.js, live CoinGecko + Jupiter data
- [x] ULTIMA terminal true wallet context — live SOL/S-IO balances injected into Groq system prompt
- [x] ULTIMA `/scan <address>` command — live on-chain RPC wallet analysis
- [x] `wallet-manager.js` unified state — `window.globalWallet` alias, `localStorage.walletAddress`, connect/disconnect events
- [x] Analytics DQN signal panel — ONNX inference with Q-value bar chart
- [ ] Trading assistant wallet context fix — read from `walletManager` not `localStorage`
- [ ] Guardian page live risk score — wire `guardian_analytics.py` to frontend
- [ ] Swap page Jupiter v6 integration — quote fetch, token selector modal, high-impact warning
- [ ] Bot dashboard real-time P&L — WebSocket or SSE polling from `/api/bots`

### Backend
- [ ] FastAPI route consolidation — all routes registered in `api/main.py`
- [ ] Pydantic v2 models for all request/response bodies
- [ ] Wallet signature authentication middleware (`X-Wallet-Signature` header)
- [ ] CORS configuration via `ALLOWED_ORIGIN` env var
- [ ] Request logging (timestamp, method, path, status, response time)

### DQN Engine
- [x] `generate_market_data.py` — synthetic market data generator
- [x] `train_market_model.py` — training pipeline
- [x] `market_environment.py` — MarketEnvironment with numeric states
- [ ] `engine.py` — `DQNReasoningEngine` facade with `infer_trading_action` + `infer_risk_score`
- [ ] `network.py` — `LayeredQNetwork` 5-layer architecture (128→256→256→128→128→actions)
- [ ] `agent.py` — `DQNAgent` with Polyak soft target updates (configurable tau)
- [ ] `buffer.py` — `ReplayBuffer`
- [ ] ONNX export pipeline — `dqn_node_model.onnx` for browser inference
- [ ] pytest suite — `dqn-core/tests/` with Hypothesis property tests

### Infrastructure
- [ ] `vercel.json` updated — output dir `web/singularity-frontend/.next`, `/api/*` rewrite
- [ ] `.env.example` with all required variables documented

---

## Q2 2026 — Core DeFi Features (Apr–Jun 2026)

### Jupiter Swap (complete)
- [ ] Token selector modal — full Jupiter token list, search by name/symbol/mint
- [ ] Quote display — output amount, price impact badge, fee breakdown, 2s refresh
- [ ] Swap execution — sign + submit via wallet adapter, pending/success/error toasts
- [ ] SOL/USDC price header — Jupiter Price API, 24h change
- [ ] High-impact warning modal — blocks confirm when price impact > 5%

### X402 Payment Protocol (complete)
- [ ] `@x402/next` middleware in `web/singularity-frontend/middleware.ts`
- [ ] Gated routes: `/api/ai/query`, `/api/guardian/premium`, `/api/bots/signals`
- [ ] `PaywallGate` component — renders on 402 response, signs `ExactSvmPayloadV2`
- [ ] Payment history page `/sio-payments` — timestamp, route, amount, tx signature
- [ ] Configurable prices via env vars (`X402_PRICE_AI_QUERY`, etc.)
- [ ] Facilitator on-chain verification — Solana RPC confirmation before resource grant

### Guardian Analytics (complete)
- [ ] Transaction history — paginated 50/page from Solana RPC
- [ ] Risk score computation — flagged programs blocklist, concentration risk, unusual patterns
- [ ] Portfolio breakdown — token holdings, USD value, 24h change, % of portfolio
- [ ] Real-time alert toast — new transaction detected within 10 seconds
- [ ] 3D network visualization — Three.js wallet connection graph
- [ ] Any-address analysis — no wallet connection required
- [ ] `/api/guardian/analyze/{address}` endpoint — risk score + flagged txs + portfolio

### Token Staking (complete)
- [ ] On-chain staking contract integration — replace simulated localStorage staking
- [ ] APY display — live from staking contract state
- [ ] TVL display — aggregate staked S-IO
- [ ] Unbonding period UI — 7-day countdown timer
- [ ] Claim rewards transaction — sign + submit via wallet adapter

---

## Q3 2026 — React/Next.js Migration (Jul–Sep 2026)

### Next.js 14+ App Router Migration
- [ ] Scaffold `web/singularity-frontend/` as Next.js 14 App Router project
- [ ] TypeScript strict mode enabled
- [ ] Tailwind CSS with JARVIS_UI design system (CSS variables from `style.css`)
- [ ] All 22 routes migrated: `/swap`, `/staking`, `/dashboard`, `/analytics`, `/bots`, `/bot-launchpad`, `/governance`, `/guardian`, `/token-launchpad`, `/portfolio`, `/social`, `/leaderboard`, `/metadata`, `/mint`, `/network3d`, `/trading-assistant`, `/ultima`, `/upload`, `/sio-payments`, `/sio-transactions`, `/investors`, `/services`
- [ ] Shared layout — `TopNav`, `WalletConnectButton`, `BalancePill`, `ToastContainer`, `MatrixBackground`
- [ ] `WalletProvider` — `@solana/wallet-adapter-react` wrapping entire app
- [ ] `X402Provider` — `@x402/next` middleware wrapping gated routes
- [ ] `pnpm-workspace.yaml` — add `web/singularity-frontend` as workspace member
- [ ] `workspace:*` dependencies on `@x402/core`, `@x402/svm`, `@x402/evm`, `@x402/http-next`
- [ ] `turbo.json` pipeline — build after X402 SDK dependencies
- [ ] Zero TypeScript errors on `pnpm build`
- [ ] Lighthouse performance ≥ 70 on dashboard page

### Component Library
- [ ] `WalletContext` — extends wallet adapter with S-IO balance, 30s auto-refresh
- [ ] `SwapForm` + `TokenSelectorModal` + `QuoteDisplay` + `HighImpactWarning`
- [ ] `BotConfigForm` + `BotStatusCard` + `BotPerformanceChart` (Recharts)
- [ ] `RiskScoreGauge` + `TransactionList` + `PortfolioBreakdown`
- [ ] `Network3DVisualization` — Three.js ported to React
- [ ] `UltimaTerminal` + `UltimaModal` + `TypingIndicator` + `PaywallGate`
- [ ] `useDQNInference` hook — `onnxruntime-web` ONNX session, fallback to rule-based

---

## Q4 2026 — Governance, Launchpad & Advanced AI (Oct–Dec 2026)

### On-Chain Governance (complete)
- [ ] `Governance_Contract` integration — fetch proposals from on-chain state
- [ ] Proposal creation — minimum S-IO balance gate (`MIN_PROPOSAL_TOKENS`)
- [ ] Vote submission — yes/no/abstain, wallet signature
- [ ] Countdown timer — voting deadline display
- [ ] Quorum enforcement — auto-execute on-chain action when quorum met
- [ ] Insufficient balance guard — error before transaction submission

### Token Launchpad (complete)
- [ ] Token creation form — name, symbol, decimals, supply, description, image, website
- [ ] Metaplex metadata upload to Arweave
- [ ] `Launchpad_Contract` integration — SPL mint creation
- [ ] Mint success card — address + Solana Explorer link
- [ ] Optional Raydium liquidity bootstrapping
- [ ] Token registry — newly launched tokens appear in swap page selector
- [ ] Arweave retry — re-upload metadata without re-creating mint on failure

### ULTIMA AI Terminal (complete)
- [ ] Full-page route `/ultima` + modal overlay from homepage
- [ ] Groq SSE streaming — token-by-token output
- [ ] 20-message conversation history with FIFO eviction
- [ ] X402 gate — 3 free queries per session, then micro-payment required
- [ ] Typing indicator — animated dots during Groq response
- [ ] Wallet-gated fallback — prompt to connect if free limit reached without wallet
- [ ] `/scan` command — live on-chain analysis of any address

### DQN Engine — Production Hardening
- [ ] `DQNReasoningEngine.train(data_path, episodes)` — JSON dataset training
- [ ] Checkpoint save/load round-trip — identical inference outputs after reload
- [ ] `ReasoningEnvironment.from_market_snapshot(...)` — (1, 128) normalized state tensor
- [ ] FastAPI integration — `/api/bots/signals` and `/api/guardian/analyze` use `DQNReasoningEngine`
- [ ] Hypothesis property tests — 100 iterations each, all 26 correctness properties
- [ ] `python -m pytest dqn-core/tests/ -v` — zero failures

---

## Q1 2027 — Platform Scaling & Ecosystem (Jan–Mar 2027)

### Multi-Wallet & Cross-Chain
- [ ] Backpack + Solflare wallet support in React adapter
- [ ] EVM wallet support (MetaMask) via `@x402/evm` for cross-chain X402 payments
- [ ] Wallet switching without page reload
- [ ] Hardware wallet support (Ledger) via `@solana/wallet-adapter-ledger`

### Advanced Bot Engine
- [ ] Live trade execution via Jupiter v6 — real on-chain swaps from bot engine
- [ ] Multi-bot coordination — portfolio-level risk management across concurrent bots
- [ ] Bot performance leaderboard — community rankings by 30d ROI
- [ ] Strategy backtesting — historical simulation against on-chain price data
- [ ] Telegram/Discord alert integration — bot status notifications

### Guardian Premium Tier
- [ ] MEV detection — identify sandwich attacks and frontrunning in transaction history
- [ ] Whale wallet tracking — alert when tracked wallets make large moves
- [ ] Token approval audit — flag unlimited approvals to unverified programs
- [ ] Cross-wallet portfolio aggregation — combine multiple wallets into one view
- [ ] Historical P&L chart — computed from on-chain transaction history

### Social & Leaderboard
- [ ] On-chain identity — link wallet to username via Solana Name Service
- [ ] Trading leaderboard — 24h/7d/30d P&L rankings
- [ ] Strategy sharing — publish bot configs as community templates
- [ ] Social feed — on-chain activity stream for followed wallets

---

## Q2 2027 — Full Platform Launch (Apr–Jun 2027)

### v1.0 Release
- [ ] All 22 pages fully functional in Next.js 14 App Router
- [ ] Zero TypeScript errors, zero ESLint violations, zero Prettier violations
- [ ] Full test suite passing — pytest + Hypothesis (Python), Vitest + fast-check (TypeScript)
- [ ] Lighthouse performance ≥ 70 on all key pages
- [ ] Vercel production deployment — `web/singularity-frontend/.next` output
- [ ] Custom domain — `singularity.io`

### Mobile
- [ ] Progressive Web App (PWA) — installable, offline-capable
- [ ] Mobile wallet deep-link support — Phantom mobile, Solflare mobile
- [ ] Responsive layout audit — all pages tested on 375px viewport

### Security & Compliance
- [ ] Smart contract audit — Staking, Governance, Launchpad contracts
- [ ] X402 Facilitator audit — payment verification logic
- [ ] Rate limiting — all public API endpoints
- [ ] DDoS protection — Vercel Edge middleware
- [ ] Content Security Policy headers

### Analytics & Observability
- [ ] Vercel Analytics integration — page views, Core Web Vitals
- [ ] Error tracking — Sentry for frontend + backend
- [ ] API latency monitoring — p50/p95/p99 per endpoint
- [ ] DQN model performance tracking — inference latency, confidence distribution

### Ecosystem Expansion
- [ ] MCP (Model Context Protocol) server — expose Singularity data to AI agents
- [ ] Public API — rate-limited free tier + X402-gated premium tier
- [ ] SDK — TypeScript client library for third-party integrations
- [ ] Developer documentation site — `docs.singularity.io`
- [ ] Grant program — fund community-built bot strategies and integrations

---

## Correctness Properties (26 total)

All 26 correctness properties defined in `.kiro/specs/singularity-revamp/design.md` must have passing property-based tests before v1.0 release. Key properties:

| # | Property | Validates |
|---|---|---|
| 1 | Wallet context completeness | Req 2.3 |
| 2 | Wallet disconnect clears state | Req 2.5 |
| 5 | High price impact warning threshold | Req 3.9 |
| 7 | Stop-loss auto-stop invariant | Req 4.8 |
| 9 | Guardian risk score range [0,100] | Req 5.2 |
| 10 | Portfolio percentages sum to 100 | Req 5.4 |
| 13 | Gated routes return 402 without payment | Req 6.2–6.3 |
| 17 | Vote tally invariant | Req 9.3 |
| 18 | ULTIMA history limit (20 messages) | Req 11.4 |
| 20 | X402 payload serialization round-trip | Req 13.1–13.3 |
| 22 | Polyak averaging correctness | Req 14.3 |
| 25 | DQN checkpoint save/load round-trip | Req 14.7–14.8 |
| 26 | Market snapshot tensor shape (1,128) | Req 14.9 |
