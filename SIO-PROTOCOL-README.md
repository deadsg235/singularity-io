# S-IO Protocol Implementation

## Overview

The S-IO (Singularity Input/Output) protocol is a payment-gated API system designed for the Singularity.io ecosystem. Based on the x402 protocol architecture, S-IO enables seamless SIO token transactions and advanced data transmission on the Solana blockchain.

## Features

- **Payment-Gated APIs**: Secure access to premium endpoints with SIO token payments
- **Solana Integration**: Native Solana blockchain settlement with SPL token support
- **Advanced Data Transmission**: Encrypted and verified data delivery with payment proof
- **Agent-to-Agent Communication**: Autonomous payment handling for AI agents
- **Staking Integration**: Discount tiers based on SIO token staking
- **Resource Discovery**: Automatic discovery of available paid resources

## Architecture

```
Client Request → 402 Payment Required → Payment Creation → 
Payment Verification → Resource Access → Settlement → Response
```

### Core Components

1. **sio_protocol.py** - Core protocol structures and handlers
2. **sio_middleware.py** - FastAPI middleware for payment gating
3. **sio_client.py** - Python client for payment creation
4. **sio-protocol.js** - JavaScript client with Phantom wallet integration

## Quick Start

### 1. Server Setup

```python
from fastapi import FastAPI, Request
from api.sio_middleware import require_sio_payment

app = FastAPI()

@app.get("/api/premium-data")
@require_sio_payment(
    amount="1000000",  # 1 SIO token (6 decimals)
    description="Premium AI trading data"
)
async def get_premium_data(request: Request):
    return {"data": "premium content"}
```

### 2. Python Client

```python
from api.sio_client import SIOClient, create_sio_payment_header
from solders.keypair import Keypair

# Create client
client = SIOClient()

# Create payment
keypair = Keypair()  # Your wallet keypair
headers = create_sio_payment_header(requirements, keypair)

# Make request
response = requests.get(url, headers=headers)
```

### 3. JavaScript Client

```javascript
// Initialize client
const client = new SIOProtocolClient({
    sioTokenMint: 'SioTkQxHyAs98ouRiyi1YDv3gLMSrX3eNBg61GH9xMd'
});

// Connect wallet
await client.connectWallet();

// Make payment request
const response = await client.makePaymentRequest(url, requirements);
```

### 4. Payment Widget

```javascript
// Create payment widget
const widget = new SIOPaymentWidget('payment-container', {
    theme: 'dark',
    onPaymentSuccess: (payment) => console.log('Paid:', payment),
    onPaymentError: (error) => console.error('Error:', error)
});

// Show payment dialog
widget.showPaymentDialog(requirements);
```

## API Endpoints

### Standard Endpoints

- `GET /` - API information
- `GET /api/health` - Health check
- `GET /api/sio/discover` - Discover S-IO resources

### Payment-Gated Endpoints

- `GET /api/neural/network` - Neural network state (0.5 SIO)
- `POST /api/neural/update` - Update neural network (1 SIO)
- `GET /api/sio/premium-data` - Premium trading data (2 SIO)
- `GET /api/sio/agent-communication` - Agent communication (0.75 SIO)

## Payment Flow

### 1. Resource Request
```http
GET /api/premium-data
```

### 2. Payment Required Response
```json
{
  "error": "SIO payment required",
  "protocol": "s-io",
  "requirements": {
    "protocol": "s-io",
    "version": 1,
    "amount": "1000000",
    "token": "SioTkQxHyAs98ouRiyi1YDv3gLMSrX3eNBg61GH9xMd",
    "recipient": "SioTreasury...",
    "description": "Premium data access"
  }
}
```

### 3. Payment Request
```http
GET /api/premium-data
X-SIO-PAYMENT: eyJwcm90b2NvbCI6InMtaW8i...
```

### 4. Successful Response
```http
HTTP/1.1 200 OK
X-SIO-SETTLEMENT: eyJzdWNjZXNzIjp0cnVl...

{
  "data": "premium content",
  "protocol": "s-io"
}
```

## Configuration

### Environment Variables

```bash
# Solana Configuration
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
SIO_TOKEN_MINT=SioTkQxHyAs98ouRiyi1YDv3gLMSrX3eNBg61GH9xMd
SIO_TREASURY_WALLET=SioTreasury1234567890123456789012345678901

# API Configuration
API_HOST=0.0.0.0
API_PORT=8000
```

### Token Configuration

```python
# SIO Token Details
SIO_TOKEN_MINT = "SioTkQxHyAs98ouRiyi1YDv3gLMSrX3eNBg61GH9xMd"
SIO_DECIMALS = 6
SIO_SYMBOL = "SIO"
```

## Testing

### Run Test Suite

```bash
# Install dependencies
pip install httpx asyncio

# Run tests
python api/test_sio_protocol.py
```

### Test Output

```
🚀 Starting S-IO Protocol Test Suite
==================================================
🏥 Testing API health
✅ API is healthy

🔍 Testing S-IO resource discovery
✅ Discovery endpoint accessible
   Protocol: s-io
   Version: 1
   Resources: 4
     - /api/neural/network: 500000 SIO
     - /api/neural/update: 1000000 SIO
     - /api/sio/premium-data: 2000000 SIO
     - /api/sio/agent-communication: 750000 SIO

🔒 Testing payment required for /api/neural/network
✅ Correctly returned 402 Payment Required
   Protocol: s-io
   Amount: 500000 SIO

💰 Testing successful payment for /api/neural/network
✅ Payment accepted, resource delivered
   Settlement: True
   Signature: 5j7k8l9m0n1p2q3r4s5t...
```

## Integration Examples

### FastAPI Middleware

```python
from api.sio_middleware import SIOMiddleware

# Initialize middleware
sio = SIOMiddleware(
    sio_token_mint="SioTkQxHyAs98ouRiyi1YDv3gLMSrX3eNBg61GH9xMd",
    treasury_wallet="SioTreasury..."
)

# Apply to specific endpoints
@app.get("/premium")
@sio.require_sio_payment(amount="1000000", description="Premium access")
async def premium_endpoint(request: Request):
    return {"data": "premium"}
```

### Staking Integration

```python
@app.get("/discounted-data")
@require_sio_payment(
    amount="1000000",
    description="Data with staking discount"
)
async def discounted_data(request: Request):
    # Apply staking discount
    wallet = request.headers.get("X-Wallet-Address")
    discount = get_staking_discount(wallet)
    
    return {
        "data": "premium content",
        "discount_applied": discount,
        "original_price": "1000000",
        "paid_price": str(int(1000000 * (1 - discount)))
    }
```

### Agent Communication

```python
@app.post("/agent/message")
@require_sio_payment(amount="250000", description="Agent messaging")
async def agent_message(request: Request):
    body = await request.json()
    
    # Process agent message
    response = process_agent_message(body)
    
    # Return secure transmission
    return SIODataTransmission(
        payment_proof=request.headers.get("X-SIO-PAYMENT"),
        data_type="json",
        data=response,
        metadata={"agent_id": body.get("agent_id")}
    ).model_dump()
```

## Security Features

### Payment Verification
- Transaction signature validation
- Amount and recipient verification
- Nonce-based replay protection
- Timeout window enforcement

### Data Protection
- Payment proof verification
- Encrypted data transmission
- Metadata integrity checks
- Audit trail logging

## Error Handling

### Error Codes
- `SIO_001`: Invalid payment payload
- `SIO_002`: Payment expired
- `SIO_003`: Insufficient balance
- `SIO_004`: Invalid signature
- `SIO_005`: Settlement failed

### Error Response Format
```json
{
  "error": "SIO payment required",
  "protocol": "s-io",
  "code": "SIO_001",
  "message": "Invalid payment payload format"
}
```

## Deployment

### Docker Setup

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Production Configuration

```python
# production_config.py
SIO_CONFIG = {
    "token_mint": "SioTkQxHyAs98ouRiyi1YDv3gLMSrX3eNBg61GH9xMd",
    "treasury_wallet": "SioTreasury1234567890123456789012345678901",
    "rpc_url": "https://api.mainnet-beta.solana.com",
    "settlement_timeout": 30,
    "max_payment_age": 300
}
```

## Roadmap

### Version 1.1 (Planned)
- Subscription model support
- Batch payment processing
- Enhanced staking integration
- Cross-chain bridge support

### Version 2.0 (Future)
- Multi-token support
- Payment channels
- Dispute resolution
- Advanced analytics

## Contributing

1. Fork the repository
2. Create feature branch
3. Implement changes
4. Add tests
5. Submit pull request

## License

MIT License - Open source for the Singularity.io ecosystem

## Support

- Documentation: `/specs/SIO-PROTOCOL.md`
- Examples: `/api/sio_examples.py`
- Tests: `/api/test_sio_protocol.py`
- Issues: GitHub Issues