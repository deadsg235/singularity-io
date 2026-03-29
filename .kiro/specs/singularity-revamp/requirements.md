# Requirements Document

## Introduction

Singularity.io is a Solana-focused DeFi platform undergoing a full-stack revamp on the `Jarvis_Revamp` branch. The current frontend is a flat vanilla JS/HTML/CSS site (~30+ pages). This revamp migrates it to a React/Next.js application that directly consumes the existing TypeScript X402 SDK monorepo packages (`@x402/core`, `@x402/svm`, `@x402/evm`), builds the missing FastAPI backend, and wires all layers together end-to-end.

The five must-have feature areas are: Solana wallet connection, Jupiter-powered token swap, AI trading bots, Guardian analytics, and X402 payment protocol integration. The J.A.R.V.I.S Command Center aesthetic and ULTIMA terminal are preserved in the new React UI.

---

## Glossary

- **App**: The Next.js 14+ React application replacing `web/singularity-frontend/`
- **API**: The FastAPI Python backend deployed as Vercel serverless functions under `api/`
- **X402_SDK**: The TypeScript monorepo packages `@x402/core`, `@x402/svm`, `@x402/evm`, and `@x402/http-next`
- **Wallet_Adapter**: The Solana wallet adapter layer (Phantom, Backpack, etc.) integrated via `@solana/wallet-adapter-react`
- **Jupiter_Client**: The Jupiter Aggregator v6 API client used for swap routing and quote fetching
- **Guardian**: The on-chain analytics and wallet monitoring subsystem
- **Bot_Engine**: The AI trading bot orchestration layer (configuration, deployment, monitoring)
- **JARVIS_UI**: The J.A.R.V.I.S Command Center design system — dark theme, monospace terminals, neural canvas
- **ULTIMA**: The sentient AI research terminal modal powered by Groq Llama 3.3 70B
- **SIO_Token**: The native S-IO SPL token used for governance, staking, and fee payments
- **Paywall**: The X402 payment-gated resource component from `@x402/http-paywall`
- **Facilitator**: The X402 payment facilitator service that verifies and settles payment transactions
- **Staking_Contract**: The on-chain Solana program managing S-IO token staking and rewards
- **Governance_Contract**: The on-chain Solana program managing proposal creation and voting
- **Launchpad_Contract**: The on-chain Solana program for SPL token creation and liquidity bootstrapping

---

## Requirements

### Requirement 1: Frontend Migration to React/Next.js

**User Story:** As a developer, I want the frontend migrated from vanilla JS to React/Next.js, so that I can consume TypeScript SDK packages directly and maintain a scalable, type-safe codebase.

#### Acceptance Criteria

1. THE App SHALL be a Next.js 14+ application using the App Router, located at `web/singularity-frontend/`
2. THE App SHALL use TypeScript with strict mode enabled
3. THE App SHALL import `@x402/core`, `@x402/svm`, `@x402/evm`, and `@x402/http-next` directly as workspace dependencies from the TypeScript monorepo
4. THE App SHALL preserve all existing routes as Next.js pages: `/swap`, `/staking`, `/dashboard`, `/analytics`, `/bots`, `/bot-launchpad`, `/governance`, `/guardian`, `/token-launchpad`, `/portfolio`, `/social`, `/leaderboard`, `/metadata`, `/mint`, `/network3d`, `/trading-assistant`, `/ultima`, `/upload`, `/sio-payments`, `/sio-transactions`, `/investors`, `/services`
5. THE App SHALL implement the JARVIS_UI design system using Tailwind CSS with a custom dark theme matching the existing color palette (CSS variables from `style.css`)
6. THE App SHALL include a shared layout component with the top navigation bar, wallet connect button, balance pill, and toast notification system
7. WHEN the App is built with `pnpm build`, THE App SHALL produce a deployable Vercel output with no TypeScript compilation errors
8. THE App SHALL achieve a Lighthouse performance score of 70 or above on the dashboard page

---

### Requirement 2: Solana Wallet Connection

**User Story:** As a DeFi user, I want to connect my Solana wallet (Phantom, Backpack, Solflare), so that I can interact with on-chain features across the platform.

#### Acceptance Criteria

1. THE Wallet_Adapter SHALL support Phantom, Backpack, and Solflare wallet extensions via `@solana/wallet-adapter-react` and `@solana/wallet-adapter-wallets`
2. WHEN a user clicks "Connect Wallet", THE Wallet_Adapter SHALL display a modal listing all detected installed wallets
3. WHEN a wallet is connected, THE Wallet_Adapter SHALL expose the public key, SOL balance, and S-IO token balance to all App pages via React context
4. WHEN a wallet is connected, THE App SHALL display the SOL balance and S-IO balance in the navigation balance pill, refreshed every 30 seconds
5. WHEN a wallet is disconnected, THE Wallet_Adapter SHALL clear all wallet state and return the App to the unauthenticated state
6. IF a wallet connection attempt fails, THEN THE Wallet_Adapter SHALL display a toast notification with the error message
7. WHILE a wallet is connected, THE Wallet_Adapter SHALL maintain the connection across page navigations without requiring reconnection
8. THE Wallet_Adapter SHALL support both mainnet-beta and devnet Solana clusters, configurable via an environment variable `NEXT_PUBLIC_SOLANA_NETWORK`

---

### Requirement 3: Jupiter-Powered Token Swap

**User Story:** As a trader, I want to swap tokens using Jupiter DEX aggregation, so that I get optimal routing and best prices across all Solana liquidity pools.

#### Acceptance Criteria

1. THE Jupiter_Client SHALL fetch swap quotes from the Jupiter v6 Quote API (`https://quote-api.jup.ag/v6/quote`) for any SPL token pair
2. WHEN a user selects input and output tokens and enters an amount, THE Jupiter_Client SHALL fetch and display a quote including: output amount, price impact percentage, and estimated fees, within 2 seconds
3. WHEN a user confirms a swap, THE Jupiter_Client SHALL fetch a swap transaction from the Jupiter v6 Swap API and submit it via the connected Wallet_Adapter
4. WHEN a swap transaction is submitted, THE App SHALL display a pending toast notification with a Solana Explorer link to the transaction signature
5. WHEN a swap transaction is confirmed on-chain, THE App SHALL display a success toast and refresh the wallet balances
6. IF a swap quote fetch fails, THEN THE Jupiter_Client SHALL display an error message and allow the user to retry
7. IF a swap transaction is rejected by the user's wallet, THEN THE App SHALL display a cancellation toast without treating it as an error
8. THE App SHALL display a token selector modal with search functionality, showing token name, symbol, mint address, and logo for all tokens in the Jupiter token list
9. WHEN price impact exceeds 5%, THE App SHALL display a high-impact warning before the user confirms the swap
10. THE App SHALL display the current SOL/USDC price and 24h change in the swap page header, fetched from the Jupiter Price API

---

### Requirement 4: AI Trading Bots

**User Story:** As an algorithmic trader, I want to configure and deploy AI trading bots, so that I can automate trading strategies with configurable risk parameters.

#### Acceptance Criteria

1. THE Bot_Engine SHALL support creating bot configurations with: strategy type (DCA, grid, momentum, arbitrage), token pair, position size in SOL, stop-loss percentage, take-profit percentage, and max daily trades
2. WHEN a user creates a bot configuration, THE API SHALL persist the configuration and return a bot ID
3. WHEN a bot is deployed, THE Bot_Engine SHALL begin executing trades according to its configuration using the Jupiter_Client for order routing
4. WHILE a bot is running, THE App SHALL display real-time status including: current P&L, number of trades executed, last trade timestamp, and current position
5. WHEN a bot executes a trade, THE API SHALL log the trade with: timestamp, token pair, direction (buy/sell), amount, price, and transaction signature
6. THE App SHALL display a bot performance dashboard with P&L chart (24h, 7d, 30d), win rate, and total volume traded
7. WHEN a user stops a bot, THE Bot_Engine SHALL cancel any pending orders and close the bot's active position within 60 seconds
8. IF a bot's stop-loss threshold is breached, THEN THE Bot_Engine SHALL automatically stop the bot and notify the user via toast notification
9. THE App SHALL support a bot launchpad page where users can browse and clone community-shared bot strategy templates
10. THE API SHALL expose a `/api/bots` endpoint returning the authenticated user's bot list with current status

---

### Requirement 5: Guardian Analytics

**User Story:** As a DeFi user, I want real-time wallet monitoring and threat detection, so that I can protect my assets and understand my portfolio risk.

#### Acceptance Criteria

1. THE Guardian SHALL fetch and display the connected wallet's full transaction history from the Solana RPC, paginated in batches of 50 transactions
2. THE Guardian SHALL compute and display a wallet risk score (0–100) based on: interaction with flagged programs, unusual transaction patterns, and concentration risk
3. WHEN a new transaction is detected on the connected wallet, THE Guardian SHALL display a real-time alert toast within 10 seconds of on-chain confirmation
4. THE Guardian SHALL display a portfolio breakdown showing token holdings with: current value in USD, 24h price change, and percentage of total portfolio
5. THE Guardian SHALL identify and flag interactions with known malicious or high-risk Solana programs using a maintained blocklist
6. THE App SHALL display a 3D network visualization of wallet connections using Three.js, showing token flow between addresses
7. WHEN a user enters any Solana wallet address, THE Guardian SHALL display the risk analysis for that address without requiring wallet connection
8. THE API SHALL expose a `/api/guardian/analyze` endpoint that accepts a wallet address and returns the risk score, flagged transactions, and portfolio summary
9. THE Guardian SHALL display historical P&L for the connected wallet, computed from on-chain transaction history
10. IF the Solana RPC rate limit is reached, THEN THE Guardian SHALL queue requests and retry with exponential backoff, displaying a loading state to the user

---

### Requirement 6: X402 Payment Protocol Integration

**User Story:** As a platform operator, I want X402 payment-gated API routes, so that users pay micro-payments in SOL or USDC to access premium data and AI features.

#### Acceptance Criteria

1. THE X402_SDK SHALL be integrated into the App via the `@x402/http-next` Next.js middleware adapter
2. THE App SHALL gate the following routes with X402 payments: `/api/ai/query` (ULTIMA AI queries), `/api/guardian/premium` (advanced Guardian analytics), `/api/bots/signals` (AI trading signals)
3. WHEN an unauthenticated request hits a gated route, THE X402_SDK SHALL return an HTTP 402 response with a `PaymentRequired` payload specifying the accepted payment schemes (SVM USDC, SVM SOL)
4. WHEN the App receives a 402 response, THE Paywall SHALL render the payment UI from `@x402/http-paywall` allowing the user to pay via their connected Wallet_Adapter
5. WHEN a user approves a payment transaction in their wallet, THE X402_SDK SHALL construct and sign an `ExactSvmPayloadV2` transaction and include it in the `X-Payment` request header
6. WHEN the Facilitator receives a payment header, THE Facilitator SHALL verify the transaction on-chain via the Solana RPC before granting access to the protected resource
7. WHEN payment verification succeeds, THE API SHALL return the requested resource with an `X-Payment-Response` header containing the settlement receipt
8. IF payment verification fails, THEN THE X402_SDK SHALL return an HTTP 402 response with a descriptive error in the `PaymentRequired.error` field
9. THE X402_SDK SHALL support payment amounts configurable per route via environment variables (e.g., `X402_PRICE_AI_QUERY=0.001`)
10. THE App SHALL display a payment history page at `/sio-payments` showing all X402 transactions with: timestamp, route accessed, amount paid, and transaction signature

---

### Requirement 7: FastAPI Backend

**User Story:** As a developer, I want a FastAPI backend deployed as Vercel serverless functions, so that the frontend has a typed, documented API for all platform features.

#### Acceptance Criteria

1. THE API SHALL be implemented in Python using FastAPI, located at `api/`, with `api/index.py` as the Vercel serverless entry point
2. THE API SHALL expose auto-generated OpenAPI documentation at `/api/docs`
3. THE API SHALL implement the following route groups: `/api/health`, `/api/wallet`, `/api/swap`, `/api/bots`, `/api/guardian`, `/api/governance`, `/api/staking`, `/api/launchpad`, `/api/ai`
4. WHEN a request is received, THE API SHALL validate all request bodies using Pydantic v2 models
5. THE API SHALL authenticate requests using a Solana wallet signature — the client signs a nonce with their private key and the API verifies the signature
6. WHEN an authenticated endpoint receives a request without a valid signature, THE API SHALL return HTTP 401 with a descriptive error message
7. THE API SHALL connect to the Solana RPC endpoint configured via the `SOLANA_RPC_URL` environment variable
8. THE API SHALL integrate with the Groq API (model: `llama-3.3-70b-versatile`) for the ULTIMA AI terminal and trading assistant endpoints
9. IF the Groq API returns an error, THEN THE API SHALL return HTTP 503 with a user-readable error message
10. THE API SHALL implement CORS allowing requests from the App's configured origin (`ALLOWED_ORIGIN` environment variable)
11. THE API SHALL log all requests with: timestamp, method, path, status code, and response time in milliseconds

---

### Requirement 8: Token Staking

**User Story:** As an S-IO token holder, I want to stake my tokens to earn rewards, so that I can participate in the protocol and earn yield.

#### Acceptance Criteria

1. THE App SHALL display the current staking APY, total value locked (TVL), and the user's staked balance on the staking page
2. WHEN a user enters a stake amount and confirms, THE Wallet_Adapter SHALL sign and submit a transaction to the Staking_Contract
3. WHEN a staking transaction is confirmed, THE App SHALL update the displayed staked balance and show a success toast
4. WHEN a user initiates an unstake, THE App SHALL display the unbonding period (configurable, default 7 days) before funds are returned
5. THE App SHALL display the user's accumulated unclaimed rewards and provide a "Claim Rewards" button
6. WHEN a user claims rewards, THE Wallet_Adapter SHALL sign and submit a claim transaction to the Staking_Contract
7. IF a staking or unstaking transaction fails, THEN THE App SHALL display the on-chain error message in a toast notification

---

### Requirement 9: On-Chain Governance

**User Story:** As an S-IO token holder, I want to create and vote on governance proposals, so that I can participate in protocol decision-making.

#### Acceptance Criteria

1. THE App SHALL display all active, passed, and failed governance proposals on the governance page, fetched from the Governance_Contract
2. WHEN a user with sufficient S-IO balance (minimum configurable via `MIN_PROPOSAL_TOKENS` env var) submits a proposal, THE Wallet_Adapter SHALL sign and submit a create-proposal transaction
3. WHEN a user votes on a proposal, THE Wallet_Adapter SHALL sign and submit a vote transaction with the user's choice (yes/no/abstain)
4. THE App SHALL display each proposal's: title, description, vote counts (yes/no/abstain), voting deadline, and current status
5. WHILE a proposal is in the voting period, THE App SHALL display a countdown timer to the voting deadline
6. WHEN a proposal's voting period ends and the quorum is met, THE Governance_Contract SHALL automatically execute the proposal's on-chain action
7. IF a user attempts to vote without sufficient S-IO balance, THEN THE App SHALL display an error message before submitting the transaction

---

### Requirement 10: Token Launchpad

**User Story:** As a project creator, I want to launch SPL tokens with metadata and initial liquidity, so that I can bootstrap a new token project on Solana.

#### Acceptance Criteria

1. THE App SHALL provide a token creation form with fields: name, symbol, decimals, total supply, description, image upload, and website URL
2. WHEN a user submits the token creation form, THE Wallet_Adapter SHALL sign and submit a transaction to the Launchpad_Contract that creates the SPL token mint and uploads metadata to Arweave via Metaplex
3. WHEN a token is created, THE App SHALL display the new mint address and a link to the Solana Explorer
4. THE App SHALL support an optional liquidity bootstrapping step where the creator can add initial SOL/token liquidity to a Raydium pool
5. WHEN a token is successfully launched, THE App SHALL add it to the platform's token registry accessible from the swap page
6. IF the Arweave upload fails, THEN THE App SHALL display an error and allow the user to retry the metadata upload without re-creating the mint

---

### Requirement 11: ULTIMA AI Terminal

**User Story:** As a power user, I want access to the ULTIMA sentient AI terminal, so that I can query market intelligence and get AI-powered trading insights.

#### Acceptance Criteria

1. THE ULTIMA SHALL be accessible as a full-page route at `/ultima` and as a modal overlay triggered from the homepage
2. WHEN a user submits a query to ULTIMA, THE API SHALL forward the query to the Groq API with a system prompt providing Solana market context
3. WHEN the Groq API returns a response, THE ULTIMA SHALL stream the response token-by-token into the terminal output using Server-Sent Events
4. THE ULTIMA SHALL maintain a conversation history of the last 20 messages within the session
5. WHERE the X402 payment feature is enabled, THE ULTIMA SHALL require an X402 micro-payment per query beyond the first 3 free queries per session
6. THE ULTIMA SHALL display a typing indicator while waiting for the Groq API response
7. IF the user's session has no connected wallet and the free query limit is reached, THEN THE ULTIMA SHALL prompt the user to connect their wallet to pay for additional queries

---

### Requirement 12: Monorepo Integration and Build Pipeline

**User Story:** As a developer, I want the App integrated into the existing pnpm + Turbo monorepo, so that all packages build together with proper dependency ordering.

#### Acceptance Criteria

1. THE App SHALL be added to the `pnpm-workspace.yaml` as a workspace member at `web/singularity-frontend`
2. THE App's `package.json` SHALL declare `@x402/core`, `@x402/svm`, `@x402/evm`, and `@x402/http-next` as dependencies using `workspace:*` references
3. WHEN `pnpm turbo run build` is executed from the `typescript/` root, THE App SHALL build after its X402_SDK dependencies complete successfully
4. THE App SHALL include a `turbo.json` pipeline entry that declares its dependency on the `@x402/core`, `@x402/svm`, and `@x402/evm` build outputs
5. THE App SHALL pass `pnpm turbo run lint:check` with zero ESLint errors
6. THE App SHALL pass `pnpm turbo run format:check` with zero Prettier formatting violations
7. WHEN `vercel.json` at the repo root is updated, THE App's build output directory SHALL be set to `web/singularity-frontend/.next` and the API rewrite SHALL route `/api/*` to `api/index.py`

---

### Requirement 13: X402 Payment Serialization Round-Trip

**User Story:** As a protocol developer, I want X402 payment payloads to serialize and deserialize correctly, so that payment headers are never corrupted in transit.

#### Acceptance Criteria

1. THE X402_SDK SHALL serialize `ExactSvmPayloadV2` objects to base64-encoded JSON strings for inclusion in the `X-Payment` HTTP header
2. THE X402_SDK SHALL deserialize `X-Payment` header values back into `ExactSvmPayloadV2` objects for verification
3. FOR ALL valid `ExactSvmPayloadV2` objects, serializing then deserializing SHALL produce an object equal to the original (round-trip property)
4. IF a malformed or truncated `X-Payment` header value is received, THEN THE X402_SDK SHALL return a descriptive parse error rather than throwing an unhandled exception
5. THE X402_SDK SHALL validate deserialized payloads against the `ExactSvmPayloadV2` Zod schema before returning them to callers

---

### Requirement 14: 5-Layer DQN Reasoning Engine

**User Story:** As a platform operator, I want a production-ready Deep Q-Network reasoning engine integrated into the platform, so that AI trading bots, Guardian risk scoring, and the ULTIMA terminal are all powered by a unified, trainable neural reasoning core.

#### Acceptance Criteria

1. THE DQN_Engine SHALL be implemented as a standalone Python package at `dqn-core/` with a clean public API: `DQNReasoningEngine`, `DQNAgent`, `QNetwork`, `LayeredQNetwork`, `ReplayBuffer`, `ReasoningEnvironment`
2. THE DQN_Engine SHALL implement a 5-layer deep Q-network (`LayeredQNetwork`) with architecture: input projection (state→256), reasoning layer 1 (256→256), reasoning layer 2 (256→128), reasoning layer 3 (128→128), output projection (128→actions), with LayerNorm and Dropout between layers
3. THE DQN_Engine SHALL use soft target-network updates (Polyak averaging with configurable tau) rather than hard copies
4. THE DQN_Engine SHALL expose `DQNReasoningEngine.infer_trading_action(price, volume, rsi, macd, ...)` returning action label, action index, Q-values, and confidence score
5. THE DQN_Engine SHALL expose `DQNReasoningEngine.infer_risk_score(wallet_features)` returning risk label, risk index, risk score (0–100), and Q-values
6. THE DQN_Engine SHALL expose `DQNReasoningEngine.train(data_path, episodes, ...)` for training on JSON datasets of `{role, content}` records
7. THE DQN_Engine SHALL support save/load of model checkpoints via `DQNReasoningEngine.save(path)` and `DQNReasoningEngine.load(path)`
8. FOR ALL valid model checkpoints, saving then loading SHALL produce identical inference outputs for the same input (round-trip property)
9. THE `ReasoningEnvironment.from_market_snapshot(price, volume, rsi, macd, bb_upper, bb_lower, sol_tps, wallet_balance)` SHALL encode live market data into a (1, 128) state tensor consumable by the agent
10. THE FastAPI backend SHALL import `DQNReasoningEngine` and use it for the `/api/bots/signals` and `/api/guardian/analyze` endpoints
11. THE DQN_Engine test suite SHALL pass with zero failures when run via `python -m pytest dqn-core/tests/ -v`
