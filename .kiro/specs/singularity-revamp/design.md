# Design Document: Singularity.io Full-Stack Revamp

## Overview

Singularity.io is a Solana-focused DeFi platform. The revamp migrates the existing flat vanilla JS/HTML/CSS frontend (~70 files in `web/singularity-frontend/`) to a React/Next.js 14+ App Router application, wires it to the existing FastAPI backend (`api/`) deployed as Vercel serverless functions, and integrates the TypeScript X402 SDK monorepo packages (`@x402/core`, `@x402/next`, `@x402/paywall`) directly as workspace dependencies.

The five must-have feature areas are: Solana wallet connection, Jupiter-powered token swap, AI trading bots, Guardian analytics, and X402 payment protocol integration. The J.A.R.V.I.S Command Center aesthetic (black × red × matrix, Orbitron/JetBrains Mono fonts, CSS variables from `style.css`) and the ULTIMA AI terminal are preserved in the new React UI.

The DQN Reasoning Engine (`dqn-core/`) is a standalone Python package that powers AI trading signals, Guardian risk scoring, and the ULTIMA terminal via the FastAPI backend.

---

## Architecture

The system is a three-tier architecture deployed entirely on Vercel:

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser                                                        │
│  Next.js 14 App Router (web/singularity-frontend/)             │
│  React + TypeScript + Tailwind CSS                             │
│  @x402/next middleware  │  @solana/wallet-adapter-react        │
│  Jupiter v6 client      │  onnxruntime-web (DQN ONNX)         │
└────────────────┬────────────────────────────────────────────────┘
                 │  HTTP / SSE / WebSocket
┌────────────────▼────────────────────────────────────────────────┐
│  Vercel Serverless Functions                                    │
│  FastAPI (api/index.py)                                        │
│  Pydantic v2 models  │  Groq Llama 3.3 70B                    │
│  DQNReasoningEngine  │  Solana RPC client                     │
│  X402 Facilitator verification                                 │
└────────────────┬────────────────────────────────────────────────┘
                 │  JSON-RPC / REST
┌────────────────▼────────────────────────────────────────────────┐
│  External Services                                              │
│  Solana RPC (mainnet-beta / devnet)                            │
│  Jupiter v6 Quote + Swap API                                   │
│  Groq API (llama-3.3-70b-versatile)                           │
│  Arweave / Metaplex (token metadata)                           │
│  Raydium (liquidity bootstrapping)                             │
└─────────────────────────────────────────────────────────────────┘
```

### Monorepo Layout

```
/ (repo root)
├── typescript/                    # X402 TypeScript SDK monorepo
│   └── packages/
│       ├── core/                  # @x402/core — types, Zod schemas, utils
│       ├── http/next/             # @x402/next — Next.js middleware adapter
│       └── http/paywall/          # @x402/paywall — payment UI component
├── api/                           # FastAPI backend (Vercel serverless)
│   ├── index.py                   # Vercel entry point
│   ├── main.py                    # FastAPI app + router registration
│   └── *.py                       # Feature routers (guardian, bots, governance…)
├── dqn-core/                      # DQN Reasoning Engine (Python package)
│   ├── engine.py                  # DQNReasoningEngine facade
│   ├── agent.py                   # DQNAgent (soft target updates)
│   ├── network.py                 # LayeredQNetwork (5-layer)
│   ├── buffer.py                  # ReplayBuffer
│   ├── environment.py             # ReasoningEnvironment
│   └── market_environment.py      # MarketEnvironment (numeric states)
└── web/singularity-frontend/      # Next.js App (replaces vanilla JS)
    ├── app/                       # App Router pages and layouts
    ├── components/                # Shared React components
    ├── lib/                       # Client utilities (Jupiter, X402, wallet)
    ├── hooks/                     # Custom React hooks
    ├── styles/                    # Tailwind config + global CSS
    └── public/                    # Static assets (ONNX model, favicon)
```

### Deployment

`vercel.json` at the repo root is updated to:
- Set `outputDirectory` to `web/singularity-frontend/.next`
- Route `/api/*` to `api/index.py`
- Preserve existing security headers

---

## Components and Interfaces

### Frontend Components

#### Layout Shell (`app/layout.tsx`)
- `WalletProvider` — wraps the app with `@solana/wallet-adapter-react` context
- `X402Provider` — wraps the app with X402 payment context from `@x402/next`
- `TopNav` — sticky navigation bar with logo, nav links, balance pill, wallet connect button
- `ToastContainer` — global toast notification system
- `MatrixBackground` — canvas-based matrix rain (ported from `matrix.js`)

#### Wallet Components
- `WalletConnectButton` — triggers wallet modal via `useWallet()` hook
- `BalancePill` — displays SOL + S-IO balances, auto-refreshes every 30s via `useInterval`
- `WalletContext` — custom React context extending wallet adapter with S-IO balance

#### Swap Page (`app/swap/page.tsx`)
- `SwapForm` — token pair selector, amount input, quote display
- `TokenSelectorModal` — searchable token list from Jupiter token list API
- `QuoteDisplay` — output amount, price impact badge, fee breakdown
- `HighImpactWarning` — modal shown when price impact > 5%

#### Bot Pages (`app/bots/page.tsx`, `app/bot-launchpad/page.tsx`)
- `BotConfigForm` — strategy, token pair, position size, stop-loss, take-profit, max daily trades
- `BotStatusCard` — real-time P&L, trade count, last trade, current position
- `BotPerformanceChart` — Recharts line chart for P&L over 24h/7d/30d
- `BotTemplateCard` — community strategy template with clone button

#### Guardian Pages (`app/guardian/page.tsx`)
- `RiskScoreGauge` — circular gauge showing 0–100 risk score
- `TransactionList` — paginated transaction history (50 per page)
- `PortfolioBreakdown` — token holdings table with USD value, 24h change, % of portfolio
- `Network3DVisualization` — Three.js wallet connection graph (ported from `network3d.js`)
- `WalletSearchBar` — address input for analyzing any wallet without connection

#### Governance Page (`app/governance/page.tsx`)
- `ProposalCard` — title, description, vote counts, countdown timer, vote buttons
- `CreateProposalModal` — form for submitting new proposals
- `VoteCountBar` — yes/no/abstain progress bars

#### Staking Page (`app/staking/page.tsx`)
- `StakingPanel` — stake/unstake form, APY display, TVL
- `RewardsPanel` — accumulated rewards, claim button, daily rate
- `UnbondingTimer` — countdown for unstaking period

#### ULTIMA Terminal (`app/ultima/page.tsx`)
- `UltimaTerminal` — full-page terminal with streaming SSE output
- `UltimaModal` — modal overlay version triggered from homepage
- `TypingIndicator` — animated dots while waiting for Groq response
- `PaywallGate` — X402 payment prompt after free query limit

#### Token Launchpad (`app/token-launchpad/page.tsx`)
- `TokenCreationForm` — name, symbol, decimals, supply, description, image upload, website
- `LiquidityBootstrapForm` — optional Raydium pool creation
- `MintSuccessCard` — displays new mint address with Solana Explorer link

#### DQN Inference (Browser-side)
- `useDQNInference` hook — loads `dqn_node_model.onnx` via `onnxruntime-web`, exposes `infer(marketData)` returning action label, Q-values, confidence
- Ported from existing `dqn-inference.js` with TypeScript types

### Backend API Routes

All routes are FastAPI routers registered in `api/main.py`:

| Route Group | File | Key Endpoints |
|---|---|---|
| `/api/health` | `health.py` | `GET /api/health` |
| `/api/wallet` | `wallet.py` | `GET /api/wallet/{address}` |
| `/api/swap` | `sio_swap.py` | `GET /api/swap/quote`, `POST /api/swap/execute` |
| `/api/bots` | `bot_agent.py` | `GET /api/bots`, `POST /api/bots`, `DELETE /api/bots/{id}` |
| `/api/bots/signals` | `bot_agent.py` | `GET /api/bots/signals` (X402-gated) |
| `/api/guardian` | `guardian_analytics.py` | `GET /api/guardian/analyze/{address}` |
| `/api/guardian/premium` | `guardian_advanced.py` | `GET /api/guardian/premium` (X402-gated) |
| `/api/governance` | `governance.py` | `GET /api/governance/proposals`, `POST /api/governance/vote` |
| `/api/staking` | `sio_staking.py` | `GET /api/staking/{wallet}`, `POST /api/staking/stake` |
| `/api/launchpad` | `tokenomics.py` | `POST /api/launchpad/create` |
| `/api/ai` | `ultima_llm.py` | `POST /api/ai/query` (X402-gated, SSE) |

### X402 Integration Points

The `@x402/next` middleware is applied in `web/singularity-frontend/middleware.ts`:

```typescript
import { withPaymentRequired } from '@x402/next'

export const middleware = withPaymentRequired({
  routes: {
    '/api/ai/query':           { amount: process.env.X402_PRICE_AI_QUERY,    asset: 'USDC' },
    '/api/guardian/premium':   { amount: process.env.X402_PRICE_GUARDIAN,    asset: 'USDC' },
    '/api/bots/signals':       { amount: process.env.X402_PRICE_BOT_SIGNALS, asset: 'USDC' },
  },
  facilitatorUrl: process.env.X402_FACILITATOR_URL,
})
```

When a 402 is received, the `<PaywallGate>` component from `@x402/paywall` renders the payment UI, constructs an `ExactSvmPayloadV2` transaction via `@x402/core`, signs it with the connected wallet adapter, and retries the request with the `X-Payment` header.

### DQN Engine API (Python)

The `DQNReasoningEngine` facade in `dqn-core/engine.py` is the single import consumed by the FastAPI backend:

```python
from dqn_core import DQNReasoningEngine

engine = DQNReasoningEngine(
    state_size=128,
    action_size=10,
    model_path="dqn-core/reasoning_dqn_model.pth",
    mode="trading"
)

# Trading signal
result = engine.infer_trading_action(price=185.0, volume=1.2e9, rsi=42.0, ...)
# → {"action_index": 1, "action_label": "BUY", "q_values": [...], "confidence": 0.87}

# Risk score
risk = engine.infer_risk_score(wallet_features=[...])
# → {"risk_index": 2, "risk_label": "MODERATE_RISK", "risk_score": 22.2, "q_values": [...]}
```

---

## Data Models

### Pydantic Models (FastAPI)

```python
class BotConfig(BaseModel):
    strategy: Literal["dca", "grid", "momentum", "arbitrage"]
    token_pair: str                    # e.g. "SOL/USDC"
    position_size_sol: float           # SOL amount
    stop_loss_pct: float               # 0–100
    take_profit_pct: float             # 0–100
    max_daily_trades: int

class BotStatus(BaseModel):
    bot_id: str
    config: BotConfig
    status: Literal["running", "stopped", "error"]
    pnl_usd: float
    trades_executed: int
    last_trade_at: Optional[datetime]
    current_position: float

class TradeLog(BaseModel):
    timestamp: datetime
    token_pair: str
    direction: Literal["buy", "sell"]
    amount: float
    price: float
    tx_signature: str

class GuardianAnalysis(BaseModel):
    wallet: str
    risk_score: float                  # 0–100
    risk_label: str
    flagged_transactions: List[str]    # tx signatures
    portfolio: List[PortfolioItem]
    historical_pnl: float

class PortfolioItem(BaseModel):
    mint: str
    symbol: str
    balance: float
    usd_value: float
    change_24h_pct: float
    portfolio_pct: float               # must sum to 100 across all items

class GovernanceProposal(BaseModel):
    id: str
    title: str
    description: str
    proposer: str
    yes_votes: float
    no_votes: float
    abstain_votes: float
    total_votes: float                 # invariant: yes + no + abstain == total
    end_time: datetime
    status: Literal["active", "passed", "failed", "executed"]

class StakingPosition(BaseModel):
    wallet: str
    staked_amount: float
    pending_rewards: float
    apy: float
    unbonding_amount: float
    unbonding_ends_at: Optional[datetime]

class X402PaymentRecord(BaseModel):
    id: str
    wallet: str
    route: str
    amount: int                        # in token smallest units
    asset: str                         # mint address
    tx_signature: str
    timestamp: datetime
    status: Literal["confirmed", "failed"]
```

### TypeScript Types (Frontend)

```typescript
// Wallet context
interface WalletState {
  publicKey: PublicKey | null
  solBalance: number
  sioBalance: number
  connected: boolean
}

// Jupiter quote
interface SwapQuote {
  inputMint: string
  outputMint: string
  inAmount: string
  outAmount: string
  priceImpactPct: number
  routePlan: RoutePlan[]
  otherAmountThreshold: string
}

// Bot configuration
interface BotConfig {
  strategy: 'dca' | 'grid' | 'momentum' | 'arbitrage'
  tokenPair: string
  positionSizeSol: number
  stopLossPct: number
  takeProfitPct: number
  maxDailyTrades: number
}

// DQN inference result
interface DQNResult {
  actionIndex: number
  actionLabel: string
  qValues: number[]
  confidence: number
  source: 'onnx' | 'fallback' | 'error'
}

// X402 payment record (localStorage)
interface PaymentRecord {
  id: string
  service: string
  amount: number
  asset: string
  status: 'confirmed' | 'failed'
  timestamp: number
  signature: string
}
```

### ULTIMA Conversation History

```typescript
interface UltimaMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
}

// Session state — max 20 messages enforced by useUltimaSession hook
interface UltimaSession {
  messages: UltimaMessage[]   // length <= 20
  freeQueriesUsed: number     // <= 3 before X402 gate
  sessionId: string
}
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Wallet context completeness

*For any* connected wallet, the wallet context exposed to all pages via React context SHALL contain a non-null public key, a non-negative SOL balance, and a non-negative S-IO token balance.

**Validates: Requirements 2.3**

---

### Property 2: Wallet disconnect clears all state

*For any* wallet state (regardless of balances or connection duration), after a disconnect event, the wallet context SHALL have a null public key, zero SOL balance, and zero S-IO balance.

**Validates: Requirements 2.5**

---

### Property 3: Jupiter quote response fields completeness

*For any* valid SPL token pair and positive input amount, the Jupiter quote response SHALL contain: `outAmount`, `priceImpactPct`, and at least one entry in `routePlan`.

**Validates: Requirements 3.2**

---

### Property 4: Token search filtering

*For any* non-empty search query string and token list, all tokens returned by the search function SHALL have their name or symbol contain the query string (case-insensitive), and no token that does not match SHALL appear in the results.

**Validates: Requirements 3.8**

---

### Property 5: High price impact warning threshold

*For any* swap quote where `priceImpactPct > 5`, the UI state SHALL include a high-impact warning flag set to true; for any quote where `priceImpactPct <= 5`, the flag SHALL be false.

**Validates: Requirements 3.9**

---

### Property 6: Bot configuration persistence round-trip

*For any* valid `BotConfig` object, creating a bot via `POST /api/bots` and then fetching it via `GET /api/bots/{id}` SHALL return a config object equal to the original.

**Validates: Requirements 4.2**

---

### Property 7: Stop-loss auto-stop invariant

*For any* running bot where the current P&L loss percentage meets or exceeds the configured `stop_loss_pct`, the bot status SHALL be `"stopped"` and no further trades SHALL be executed.

**Validates: Requirements 4.8**

---

### Property 8: Transaction pagination batch size

*For any* wallet address with transaction history, each page returned by the Guardian transaction history endpoint SHALL contain at most 50 transactions.

**Validates: Requirements 5.1**

---

### Property 9: Guardian risk score range

*For any* wallet address, the risk score returned by `GET /api/guardian/analyze/{address}` SHALL be a float in the closed interval [0, 100].

**Validates: Requirements 5.2**

---

### Property 10: Portfolio percentages sum to 100

*For any* wallet with at least one token holding, the sum of `portfolio_pct` across all `PortfolioItem` entries in the Guardian analysis response SHALL equal 100 (within floating-point tolerance of 0.01).

**Validates: Requirements 5.4**

---

### Property 11: Blocklist flagging completeness

*For any* set of transactions, every transaction that interacts with a program address present in the Guardian blocklist SHALL appear in the `flagged_transactions` list of the analysis response.

**Validates: Requirements 5.5**

---

### Property 12: Guardian analyze endpoint response fields

*For any* valid Solana wallet address, `GET /api/guardian/analyze/{address}` SHALL return a response containing `risk_score`, `flagged_transactions`, and `portfolio` fields with correct types.

**Validates: Requirements 5.8**

---

### Property 13: Gated routes return 402 without valid payment

*For any* HTTP request to `/api/ai/query`, `/api/guardian/premium`, or `/api/bots/signals` that does not include a valid `X-Payment` header, the response status SHALL be 402 and the body SHALL contain a `PaymentRequired` payload with accepted payment schemes.

**Validates: Requirements 6.2, 6.3**

---

### Property 14: Successful payment response includes settlement header

*For any* request to a gated route that includes a valid and verified `X-Payment` header, the response SHALL include an `X-Payment-Response` header containing the settlement receipt.

**Validates: Requirements 6.7**

---

### Property 15: Pydantic validation rejects invalid request bodies

*For any* request to a FastAPI endpoint with a request body that does not conform to the declared Pydantic model, the API SHALL return HTTP 422 with a validation error detail.

**Validates: Requirements 7.4**

---

### Property 16: Missing authentication returns 401

*For any* request to an authenticated FastAPI endpoint that does not include a valid wallet signature in the `X-Wallet-Signature` header, the API SHALL return HTTP 401.

**Validates: Requirements 7.5, 7.6**

---

### Property 17: Vote tally invariant

*For any* governance proposal, the `total_votes` field SHALL equal `yes_votes + no_votes + abstain_votes` at all times.

**Validates: Requirements 9.3**

---

### Property 18: ULTIMA conversation history limit

*For any* ULTIMA session, after any number of messages are added, the `messages` array SHALL never exceed 20 entries; when the 21st message is added, the oldest message SHALL be evicted.

**Validates: Requirements 11.4**

---

### Property 19: ULTIMA free query limit enforcement

*For any* ULTIMA session without a connected wallet, after 3 queries have been submitted, any subsequent query SHALL be blocked and the user SHALL be prompted to connect their wallet.

**Validates: Requirements 11.5**

---

### Property 20: X402 payload serialization round-trip

*For any* valid `ExactSvmPayloadV2` object, serializing it to a base64-encoded JSON string and then deserializing that string SHALL produce an object deeply equal to the original.

**Validates: Requirements 13.1, 13.2, 13.3**

---

### Property 21: Malformed X-Payment header returns parse error

*For any* string that is not a valid base64-encoded `ExactSvmPayloadV2` JSON (truncated, corrupted, or wrong schema), the X402 SDK deserializer SHALL return a descriptive error value rather than throwing an unhandled exception.

**Validates: Requirements 13.4**

---

### Property 22: Soft target-network update (Polyak averaging)

*For any* DQN agent after a learning step with tau τ, for every parameter θ in the target network, the updated value SHALL equal `τ * θ_online + (1 - τ) * θ_target_old` within floating-point tolerance.

**Validates: Requirements 14.3**

---

### Property 23: Trading inference output fields and ranges

*For any* valid 128-dimensional market state tensor, `DQNReasoningEngine.infer_trading_action()` SHALL return a dict containing `action_index` (int in [0, 9]), `action_label` (string in TRADING_ACTIONS), `q_values` (list of 10 floats), and `confidence` (float in [0, 1]).

**Validates: Requirements 14.4**

---

### Property 24: Risk score range invariant

*For any* wallet feature vector, `DQNReasoningEngine.infer_risk_score()` SHALL return a `risk_score` in the closed interval [0, 100].

**Validates: Requirements 14.5**

---

### Property 25: DQN checkpoint save/load round-trip

*For any* trained `DQNReasoningEngine`, saving the checkpoint to disk and loading it into a new engine instance SHALL produce identical `infer_trading_action` outputs for the same input state.

**Validates: Requirements 14.7, 14.8**

---

### Property 26: Market snapshot state tensor shape and normalization

*For any* valid market snapshot (price, volume, rsi, macd, bb_upper, bb_lower, sol_tps, wallet_balance), `ReasoningEnvironment.from_market_snapshot()` SHALL return a tensor of shape `(1, 128)` where all values are in the range `[-1, 1]`.

**Validates: Requirements 14.9**

---

## Error Handling

### Frontend Error Boundaries

- Each page is wrapped in a React `ErrorBoundary` that catches render errors and displays a JARVIS-styled fallback UI
- Network errors from API calls are caught in `try/catch` blocks and dispatched to the global toast system
- Wallet errors (connection failure, transaction rejection, insufficient funds) are caught by the wallet adapter event system and surfaced as toast notifications

### API Error Responses

All FastAPI endpoints return structured error responses:

```python
class ErrorResponse(BaseModel):
    error: str          # machine-readable error code
    message: str        # human-readable description
    detail: Any = None  # optional additional context
```

| Condition | HTTP Status | Error Code |
|---|---|---|
| Invalid request body | 422 | `VALIDATION_ERROR` |
| Missing/invalid wallet signature | 401 | `UNAUTHORIZED` |
| X402 payment required | 402 | `PAYMENT_REQUIRED` |
| X402 payment verification failed | 402 | `PAYMENT_VERIFICATION_FAILED` |
| Resource not found | 404 | `NOT_FOUND` |
| Groq API unavailable | 503 | `AI_SERVICE_UNAVAILABLE` |
| Solana RPC error | 502 | `RPC_ERROR` |
| Rate limit reached | 429 | `RATE_LIMITED` |

### Solana RPC Resilience

The RPC client (`api/rpc_client.py`) implements:
- Round-robin across a pool of RPC endpoints (mainnet-beta, Phantom RPC, Ankr)
- Exponential backoff with jitter on 429/503 responses (base 1s, max 30s, 5 retries)
- Request queuing when all endpoints are rate-limited
- Loading state propagated to the frontend via a `rpc_status` field in responses

### DQN Engine Fallback

If the ONNX model fails to load in the browser (network error, WASM unavailable), `useDQNInference` falls back to a rule-based heuristic using RSI thresholds (matching the existing `dqn-inference.js` fallback logic). The `source` field in the result indicates `"fallback"` vs `"onnx"`.

If the Python DQN engine fails to load on the backend (missing checkpoint, PyTorch unavailable), the `/api/bots/signals` and `/api/guardian/analyze` endpoints return a degraded response with `dqn_available: false` and use the rule-based fallback from `generate_market_data.py`.

### X402 Payment Errors

- If the Facilitator cannot verify a payment (RPC timeout, invalid signature), the middleware returns 402 with `error: "VERIFICATION_FAILED"` and the original `PaymentRequired` payload so the client can retry
- If the `X-Payment` header is malformed, the SDK returns a parse error (never throws) per Property 21
- Payment history is persisted to localStorage on the client; failed payments are recorded with `status: "failed"` for transparency

---

## Testing Strategy

### Dual Testing Approach

Both unit tests and property-based tests are required. Unit tests verify specific examples, edge cases, and integration points. Property tests verify universal invariants across randomly generated inputs.

### Python Backend — pytest + Hypothesis

Property-based tests use [Hypothesis](https://hypothesis.readthedocs.io/) for the FastAPI backend and DQN engine.

```
dqn-core/tests/
├── test_engine.py          # Properties 22–26 (DQN engine)
├── test_market_env.py      # Property 26 (state tensor)
└── test_agent.py           # Property 22 (Polyak averaging)

api/tests/
├── test_guardian.py        # Properties 9, 10, 11, 12
├── test_bots.py            # Properties 6, 7
├── test_governance.py      # Property 17
├── test_x402.py            # Properties 13, 14, 15, 16
└── test_ultima.py          # Properties 18, 19
```

Each property test is tagged with a comment referencing the design property:
```python
# Feature: singularity-revamp, Property 9: Guardian risk score range
@given(st.text(min_size=32, max_size=44))  # Solana address-like strings
@settings(max_examples=100)
def test_risk_score_range(wallet_address):
    result = analyze_wallet(wallet_address)
    assert 0.0 <= result["risk_score"] <= 100.0
```

### TypeScript Frontend — Vitest + fast-check

Property-based tests use [fast-check](https://fast-check.dev/) for the Next.js frontend.

```
web/singularity-frontend/
└── __tests__/
    ├── wallet.test.ts       # Properties 1, 2
    ├── swap.test.ts         # Properties 3, 4, 5
    ├── guardian.test.ts     # Properties 9, 10
    ├── x402.test.ts         # Properties 20, 21
    └── ultima.test.ts       # Properties 18, 19
```

Each property test is tagged:
```typescript
// Feature: singularity-revamp, Property 20: X402 payload serialization round-trip
it('serializes and deserializes ExactSvmPayloadV2 round-trip', () => {
  fc.assert(
    fc.property(arbitraryExactSvmPayloadV2(), (payload) => {
      const serialized = serializePayload(payload)
      const deserialized = deserializePayload(serialized)
      expect(deserialized).toEqual(payload)
    }),
    { numRuns: 100 }
  )
})
```

### Unit Test Focus Areas

Unit tests (not property tests) cover:
- Specific swap flow examples (happy path, user rejection, RPC failure)
- Wallet connection modal rendering with specific wallet adapters
- ULTIMA streaming SSE response parsing
- Token launchpad form validation with specific invalid inputs
- Governance proposal countdown timer rendering
- Staking/unstaking transaction submission with mock wallet

### Property Test Configuration

- Minimum 100 iterations per property test (`max_examples=100` in Hypothesis, `numRuns: 100` in fast-check)
- Each property test references its design document property via the tag comment format above
- Each correctness property is implemented by exactly one property-based test
- CI runs `python -m pytest dqn-core/tests/ api/tests/ -v` and `pnpm vitest --run` in the `web/singularity-frontend/` workspace
