# Singularity.io Frontend

Vanilla JS/HTML/CSS multi-page application — currently on `Jarvis_Revamp` branch, migrating to Next.js 14+ App Router in Q3 2026.

## Pages

| Route | File | Description |
|---|---|---|
| `/` | `index.html` | Homepage — matrix background, ULTIMA modal trigger, nav |
| `/analytics` | `analytics.html` | Market charts (SOL, S-IO, volume, buy/sell), DQN signal |
| `/swap` | `swap.html` | Jupiter v6 token swap |
| `/staking` | `staking.html` | S-IO token staking, rewards, unbonding |
| `/governance` | `governance.html` | On-chain proposals + voting |
| `/guardian` | `guardian-simple.html` | Wallet risk scoring + transaction history |
| `/guardian-advanced` | `guardian-advanced.html` | Premium analytics (X402-gated) |
| `/bots` | `bot.html` | AI trading bot dashboard |
| `/bot-launchpad` | `bot-launchpad.html` | Community strategy templates |
| `/ultima` | `ultima.html` | ULTIMA AI terminal (full-page) |
| `/trading-assistant` | `trading-assistant.html` | Groq-powered trading chat |
| `/portfolio` | `portfolio.html` | Token holdings + USD values |
| `/token-launchpad` | `token-launchpad.html` | SPL token creation |
| `/network3d` | `network3d.html` | Three.js wallet connection graph |
| `/leaderboard` | `leaderboard.html` | Trading performance rankings |
| `/social` | `social.html` | On-chain activity feed |
| `/sio-payments` | `sio-payments.html` | X402 payment history |
| `/sio-transactions` | `sio-transactions.html` | S-IO token transaction history |
| `/metadata` | `metadata.html` | Token metadata viewer |
| `/mint` | `mint.html` | NFT/token minting |
| `/upload` | `upload.html` | Asset upload |
| `/investors` | `investors.html` | Investor information |
| `/services` | `services.html` | Platform services catalog |

## Core Scripts

### Wallet Stack
- **`wallet-manager.js`** — Unified wallet state. Single source of truth. Exposes `window.walletManager` with `connect()`, `disconnect()`, `loadBalances()`. Fires `walletConnected` / `walletDisconnected` CustomEvents. Sets `window.globalWallet` alias and `localStorage.walletAddress`.
- **`wallet-balance-loader.js`** — RPC balance fetcher. Tries 5 endpoints with exponential backoff. Updates all `#sol-balance` / `#sio-balance` elements. Dispatches `balanceUpdated` event. Caches to `window._cachedBalances`.
- **`sio-wallet-adapter.js`** — Multi-wallet adapter (Phantom, Solflare, Backpack, Glow) with RPC caching.

### AI & Inference
- **`groq-client.js`** — Groq API streaming client. `window.groqChat(messages, { system, onChunk })`. Model: `openai/gpt-oss-120b`.
- **`dqn-inference.js`** — Browser ONNX inference via `onnxruntime-web`. Loads `dqn_node_model.onnx`. `window.dqnInfer(marketData)` returns `{ actionLabel, actionIndex, qValues, confidence, color, source }`. Falls back to RSI-based heuristic if ONNX unavailable.
- **`ultima.js`** — ULTIMA full-page terminal. True wallet context, live balance injection into Groq prompts, `/scan` on-chain command.
- **`ultima-terminal.js`** — ULTIMA modal (homepage). 5-layer DQN pipeline class, reads from `walletManager`.

### Payments
- **`x402-client.js`** — X402 payment protocol client. `window.x402Pay({ serviceName, asset, amount, payTo, payerPubkey })`. Builds `ExactSvmPayloadV2`, signs with Phantom, confirms on-chain, persists to localStorage.

### Analytics
- **`analytics.js`** — Market analytics page. Chart.js charts for SOL price, S-IO price, volume, buy/sell activity. CoinGecko + Jupiter Price API. DQN signal panel.

### UI
- **`matrix.js`** — Canvas matrix rain background animation.
- **`jarvis-ui.js`** — JARVIS Command Center UI utilities.
- **`sidebar.js`** — Navigation sidebar.

## Wallet Context Pattern

All pages follow this pattern for wallet state:

```javascript
// Read wallet pubkey (works regardless of which page loaded the wallet)
const pubkey = window.walletManager?.publicKey
    || window.solana?.publicKey?.toString()
    || localStorage.getItem('walletAddress');

// Listen for wallet events
window.addEventListener('walletConnected', (e) => {
    const { publicKey } = e.detail;
    // update page state
});

window.addEventListener('balanceUpdated', (e) => {
    const { sol, sio } = e.detail;
    // update balance displays
});
```

## Local Development

```bash
cd web/singularity-frontend
python -m http.server 8080
# open http://localhost:8080
```

Or with live reload:
```bash
npx serve . -p 8080
```

## Script Load Order

Pages must load scripts in this order:

```html
<script src="https://unpkg.com/@solana/web3.js@latest/lib/index.iife.min.js"></script>
<script src="wallet-balance-loader.js"></script>
<script src="wallet-manager.js"></script>
<!-- page-specific scripts -->
```

For pages using DQN inference:
```html
<script src="https://cdn.jsdelivr.net/npm/onnxruntime-web@1.17.1/dist/ort.min.js"></script>
<script src="dqn-inference.js"></script>
```

For pages using Groq:
```html
<script src="groq-client.js"></script>
```

## Design System

JARVIS Command Center aesthetic:
- Background: `#0a0a0a`
- Primary accent: `#dc2626` (red)
- Secondary accent: `#0066ff` (blue)
- Success: `#00ff88` (green)
- Font: Orbitron (headings), JetBrains Mono / Courier New (terminal)
- CSS variables defined in `style.css`

## Next.js Migration (Q3 2026)

The vanilla JS frontend will be migrated to Next.js 14+ App Router. See `.kiro/specs/singularity-revamp/requirements.md` Requirement 1 and `.kiro/specs/singularity-revamp/design.md` for the full migration plan.
