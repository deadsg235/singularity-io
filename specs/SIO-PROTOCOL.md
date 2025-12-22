# S-IO Protocol Specification v1.0

## Overview

S-IO (Singularity Input/Output) is a payment protocol designed for the Singularity.io ecosystem, enabling seamless SIO token transactions and advanced data transmission on the Solana blockchain.

## Protocol Architecture

### Core Components

1. **Payment Requirements**: Server-defined payment specifications
2. **Payment Payload**: Client-signed payment authorization
3. **Settlement Response**: Blockchain transaction confirmation
4. **Data Transmission**: Advanced data wrapper with payment proof

### Protocol Flow

```
Client Request → 402 Payment Required → Payment Creation → 
Payment Verification → Resource Access → Settlement → Response
```

## Message Structures

### 1. Payment Requirements

```json
{
  "protocol": "s-io",
  "version": 1,
  "network": "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
  "amount": "1000000",
  "token": "SioTkQxHyAs98ouRiyi1YDv3gLMSrX3eNBg61GH9xMd",
  "recipient": "SioTreasury1234567890123456789012345678901",
  "resource": "https://api.singularity.io/premium-data",
  "description": "Access to premium AI trading data",
  "timeout": 60,
  "nonce": "a1b2c3d4e5f6..."
}
```

### 2. Payment Payload

```json
{
  "protocol": "s-io",
  "version": 1,
  "signature": "5j7k8l9m0n...",
  "transaction": "base64_encoded_transaction",
  "payer": "UserWallet1234567890123456789012345678901",
  "timestamp": 1704067200
}
```

### 3. Settlement Response

```json
{
  "success": true,
  "signature": "5j7k8l9m0n...",
  "payer": "UserWallet1234567890123456789012345678901",
  "amount": "1000000"
}
```

### 4. Data Transmission

```json
{
  "protocol": "s-io-data",
  "version": 1,
  "payment_proof": "5j7k8l9m0n...",
  "data_type": "json",
  "data": { "key": "value" },
  "metadata": {
    "timestamp": 1704067200,
    "resource": "premium-data"
  },
  "encryption": null
}
```

## HTTP Headers

### Request Headers
- `X-SIO-PAYMENT`: Base64 encoded payment payload
- `Content-Type`: application/json

### Response Headers
- `X-SIO-SETTLEMENT`: Base64 encoded settlement response
- `Content-Type`: application/json

## Status Codes

- `200 OK`: Payment verified and resource delivered
- `402 Payment Required`: Payment missing or invalid
- `400 Bad Request`: Malformed payment payload
- `500 Internal Server Error`: Settlement failed

## Security Features

### Replay Protection
- Unique nonce per transaction
- Timestamp validation with timeout window
- Transaction signature verification

### Amount Verification
- Exact amount matching
- Token mint validation
- Recipient address verification

### Network Security
- Solana blockchain settlement
- SPL token transfer validation
- Transaction simulation before settlement

## Integration Patterns

### FastAPI Middleware

```python
from api.sio_middleware import require_sio_payment

@app.get("/premium-data")
@require_sio_payment(amount="1000000", description="Premium data access")
async def get_premium_data(request: Request):
    return {"data": "premium content"}
```

### JavaScript Client

```javascript
const client = new SIOProtocolClient({
    sioTokenMint: 'SioTkQxHyAs98ouRiyi1YDv3gLMSrX3eNBg61GH9xMd'
});

await client.connectWallet();
const response = await client.makePaymentRequest(url, requirements);
```

### Payment Widget

```javascript
const widget = new SIOPaymentWidget('payment-container', {
    theme: 'dark',
    onPaymentSuccess: (payment) => console.log('Paid:', payment),
    onPaymentError: (error) => console.error('Error:', error)
});

widget.showPaymentDialog(requirements);
```

## Use Cases

### 1. API Monetization
- Pay-per-call API endpoints
- Premium data access
- AI model inference requests

### 2. Agent-to-Agent Transactions
- Autonomous agent payments
- Service discovery and payment
- Cross-agent data exchange

### 3. Advanced Data Transmission
- Encrypted data delivery
- Streaming data with payment proof
- Multi-part data transfers

### 4. Staking Integration
- Discounted rates for stakers
- Tier-based pricing
- Loyalty rewards

## Token Economics

### SIO Token Utility
- Protocol payment currency
- Staking for discounts
- Governance participation
- Treasury accumulation

### Fee Structure
- Base transaction: 0.000005 SOL
- Token transfer: Variable based on amount
- Settlement: Included in transaction

## Network Support

### Mainnet
- Network: `solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp`
- Token: SIO SPL Token
- RPC: https://api.mainnet-beta.solana.com

### Devnet
- Network: `solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1`
- Token: SIO Test Token
- RPC: https://api.devnet.solana.com

## Error Codes

- `SIO_001`: Invalid payment payload
- `SIO_002`: Payment expired
- `SIO_003`: Insufficient balance
- `SIO_004`: Invalid signature
- `SIO_005`: Settlement failed
- `SIO_006`: Nonce already used
- `SIO_007`: Amount mismatch
- `SIO_008`: Invalid recipient

## Future Extensions

### Planned Features
- Multi-token support
- Cross-chain bridges
- Subscription models
- Batch payments
- Payment channels
- Dispute resolution

### Protocol Versioning
- Version 1.0: Core payment protocol
- Version 1.1: Subscription support (planned)
- Version 2.0: Cross-chain support (planned)

## Comparison with x402

### Similarities
- Payment-gated resources
- HTTP header-based protocol
- Verification and settlement flow
- Middleware integration

### Differences
- **Blockchain**: Solana vs EVM
- **Token**: SIO vs USDC
- **Speed**: Faster settlement on Solana
- **Fees**: Lower transaction costs
- **Integration**: Native Singularity.io ecosystem

## Implementation Notes

### Client Requirements
- Phantom wallet or compatible Solana wallet
- SIO token balance
- Network connectivity

### Server Requirements
- FastAPI or compatible framework
- Solana RPC access
- SIO protocol middleware
- Payment verification logic

### Best Practices
- Always verify payments before resource delivery
- Implement nonce tracking to prevent replay
- Use timeout windows for payment expiration
- Log all transactions for audit trail
- Handle settlement failures gracefully

## License

MIT License - Open source protocol for the Singularity.io ecosystem

## Version History

- v1.0 (2024): Initial S-IO protocol specification
- Based on x402 protocol design patterns
- Optimized for Solana blockchain and SIO token economy