# S-IO Protocol — X402 Payment Integration

## Overview

The S-IO payment protocol is built on the [X402 standard](https://x402.org) — an HTTP 402-based micro-payment protocol for Solana. It enables payment-gated API routes where users pay in SOL or USDC (SPL tokens) to access premium platform features.

**Token**: S-IO — `Fuj6EDWQHBnQ3eEvYDujNQ4rPLSkhm3pBySbQ79Bpump`

---

## Architecture

```
Browser                          API Server                    Solana
  │                                  │                            │
  │── GET /api/ai/query ────────────>│                            │
  │<── 402 PaymentRequired ──────────│                            │
  │                                  │                            │
  │── build ExactSvmPayloadV2        │                            │
  │── sign with Phantom wallet       │                            │
  │── GET /api/ai/query ────────────>│                            │
  │   X-Payment: <base64-payload>    │── verify tx on-chain ─────>│
  │                                  │<── confirmed ──────────────│
  │<── 200 OK ───────────────────────│                            │
  │   X-Payment-Response: <receipt>  │                            │
```

---

## Gated Routes

| Route | Price | Asset | Description |
|---|---|---|---|
| `POST /api/ai/query` | `X402_PRICE_AI_QUERY` | USDC | ULTIMA AI queries |
| `GET /api/guardian/premium` | `X402_PRICE_GUARDIAN` | USDC | Advanced Guardian analytics |
| `GET /api/bots/signals` | `X402_PRICE_BOT_SIGNALS` | USDC | DQN trading signals |

Prices are configurable via environment variables (default: 0.001 USDC per query).

---

## Payment Flow

### 1. Initial Request → 402 Response

```http
GET /api/ai/query
```

```json
{
  "x402Version": 2,
  "accepts": [{
    "scheme": "exact",
    "network": "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
    "maxAmountRequired": "1000",
    "asset": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    "payTo": "<facilitator-address>",
    "maxTimeoutSeconds": 300,
    "extra": { "name": "ULTIMA AI Query", "description": "One AI query to ULTIMA terminal" }
  }]
}
```

### 2. Client Builds Payment

```javascript
// x402-client.js
const { payload } = await buildX402Payment(requirements, payerPubkey);
// Signs SPL TransferChecked instruction with Phantom
// Encodes as base64 ExactSvmPayloadV2
```

### 3. Retry with Payment Header

```http
GET /api/ai/query
X-Payment: eyJ4NDAyVmVyc2lvbiI6MiwicGF5bG9hZCI6...
```

### 4. Facilitator Verifies On-Chain

The X402 middleware calls the Facilitator service which:
1. Decodes the `X-Payment` header
2. Verifies the SPL transfer transaction on Solana RPC
3. Confirms amount, recipient, and token match requirements
4. Returns settlement receipt

### 5. Success Response

```http
HTTP/1.1 200 OK
X-Payment-Response: eyJzdWNjZXNzIjp0cnVlLCJ0eCI6Ii4uLiJ9
Content-Type: application/json

{ "result": "..." }
```

---

## Client Usage (JavaScript)

```javascript
// Full payment flow
const result = await window.x402Pay({
    serviceName: 'ultima-ai',
    asset: window.X402_TOKENS.USDC,
    amount: '1000',                    // in token smallest units (1000 = 0.001 USDC)
    payTo: '<facilitator-address>',
    payerPubkey: window.walletManager.publicKey,
    onStatus: (msg) => console.log('[X402]', msg)
});
// result.signature — confirmed Solana tx signature

// Check if service is unlocked (30-day window)
const unlocked = window.x402IsUnlocked('ultima-ai', pubkey);

// Get all unlocked services
const services = window.x402GetUnlocked(pubkey);
```

---

## Middleware Configuration (Next.js)

```typescript
// web/singularity-frontend/middleware.ts
import { withPaymentRequired } from '@x402/next'

export const middleware = withPaymentRequired({
  routes: {
    '/api/ai/query':         { amount: process.env.X402_PRICE_AI_QUERY,    asset: 'USDC' },
    '/api/guardian/premium': { amount: process.env.X402_PRICE_GUARDIAN,    asset: 'USDC' },
    '/api/bots/signals':     { amount: process.env.X402_PRICE_BOT_SIGNALS, asset: 'USDC' },
  },
  facilitatorUrl: process.env.X402_FACILITATOR_URL,
})
```

---

## Payload Schema

`ExactSvmPayloadV2` (validated via Zod in `@x402/core`):

```typescript
interface ExactSvmPayloadV2 {
  x402Version: 2
  scheme: "exact"
  network: string           // CAIP-2 chain ID
  payload: {
    transaction: string     // base64-encoded signed Solana transaction
    signature?: string      // optional pre-extracted signature
  }
}
```

**Serialization**: base64-encoded JSON string in `X-Payment` header.

**Round-trip guarantee**: `deserialize(serialize(payload))` deep-equals original (Correctness Property 20).

**Malformed header**: SDK returns descriptive error, never throws (Correctness Property 21).

---

## Token Configuration

```bash
# Known token mints
USDC:  EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
S-IO:  Fuj6EDWQHBnQ3eEvYDujNQ4rPLSkhm3pBySbQ79Bpump
SOL:   So11111111111111111111111111111111111111112
```

---

## Payment History

All X402 payments are persisted to `localStorage` under key `sio-payments-{pubkey}`:

```javascript
{
  service: 'ultima-ai',
  amount: 1000,
  asset: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  status: 'confirmed',
  timestamp: 1743200000000,
  signature: '5j7k8l9m...',
  id: '5j7k8l9m0n1p2q3r'
}
```

Viewable at `/sio-payments`.

---

## Error Codes

| Code | HTTP | Description |
|---|---|---|
| `PAYMENT_REQUIRED` | 402 | No valid X-Payment header |
| `PAYMENT_VERIFICATION_FAILED` | 402 | On-chain verification failed |
| `PAYMENT_EXPIRED` | 402 | Transaction blockhash expired |
| `PAYMENT_AMOUNT_MISMATCH` | 402 | Amount doesn't match requirements |
| `PAYMENT_RECIPIENT_MISMATCH` | 402 | Wrong recipient address |

---

## Roadmap

### Q2 2026
- [ ] Subscription model — pay once, access for 30 days
- [ ] Batch payments — single transaction for multiple service unlocks
- [ ] SOL payment support (in addition to USDC)

### Q3 2026
- [ ] S-IO token payment support with staking discount tiers
- [ ] Payment channels — off-chain micropayments with periodic settlement

### Q1 2027
- [ ] Cross-chain payments via `@x402/evm` (EVM wallets)
- [ ] Dispute resolution mechanism
- [ ] Public payment analytics dashboard

---

## SDK Packages

| Package | Description |
|---|---|
| `@x402/core` | Types, Zod schemas, serialization utilities |
| `@x402/svm` | Solana payment mechanism (`ExactSvmPayloadV2`) |
| `@x402/evm` | EVM payment mechanism |
| `@x402/http-next` | Next.js middleware adapter |
| `@x402/http-paywall` | Payment UI component |

Source: `typescript/packages/` in this repo.
