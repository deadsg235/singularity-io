"""
S-IO Protocol Integration Examples
Demonstrates how to integrate S-IO protocol with Singularity.io API endpoints
"""

from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from api.sio_middleware import require_sio_payment, sio_protected
from api.sio_protocol import SIODataTransmission
import json

app = FastAPI(title="Singularity.io S-IO Protocol Demo")

# Example 1: Simple payment-gated endpoint
@app.get("/api/premium-data")
@require_sio_payment(
    amount="1000000",  # 1 SIO token (6 decimals)
    description="Access to premium AI trading data"
)
async def get_premium_data(request: Request):
    """Premium trading data requiring SIO payment"""
    return {
        "data": {
            "btc_prediction": "bullish",
            "confidence": 0.87,
            "timeframe": "24h",
            "signals": ["volume_spike", "rsi_oversold"]
        },
        "timestamp": "2024-01-01T12:00:00Z",
        "source": "singularity-ai"
    }

# Example 2: Tiered pricing based on data complexity
@app.get("/api/neural/analysis/{complexity}")
@require_sio_payment(
    amount="500000",  # Base price: 0.5 SIO
    description="Neural network analysis"
)
async def neural_analysis(complexity: str, request: Request):
    """Neural analysis with tiered pricing"""
    
    # Adjust pricing based on complexity
    pricing_multiplier = {
        "basic": 1,
        "advanced": 2,
        "expert": 5
    }
    
    base_amount = 500000
    multiplier = pricing_multiplier.get(complexity, 1)
    required_amount = base_amount * multiplier
    
    # In production, you'd validate the payment amount matches the complexity
    
    return {
        "analysis": f"{complexity}_neural_analysis_results",
        "complexity": complexity,
        "cost": required_amount,
        "results": {
            "patterns": ["pattern_1", "pattern_2"],
            "confidence": 0.92,
            "recommendations": ["buy", "hold"]
        }
    }

# Example 3: Agent-to-agent communication
@app.post("/api/agent/communicate")
@sio_protected(amount="250000", description="Agent communication service")
async def agent_communicate(request: Request):
    """Secure agent-to-agent communication"""
    body = await request.json()
    
    # Create secure data transmission
    transmission = SIODataTransmission(
        payment_proof=request.headers.get("X-SIO-PAYMENT", ""),
        data_type="json",
        data={
            "message": body.get("message"),
            "response": "Agent communication processed",
            "status": "success"
        },
        metadata={
            "agent_id": body.get("agent_id"),
            "timestamp": "2024-01-01T12:00:00Z"
        }
    )
    
    return transmission.model_dump()

# Example 4: Streaming data with payment
@app.get("/api/stream/market-data")
@require_sio_payment(
    amount="2000000",  # 2 SIO for streaming access
    description="Real-time market data stream",
    timeout=300  # 5 minute timeout for streaming
)
async def stream_market_data(request: Request):
    """Streaming market data endpoint"""
    
    # In production, this would be a WebSocket or Server-Sent Events
    return {
        "stream_url": "wss://api.singularity.io/stream/market",
        "access_token": "stream_token_123",
        "duration": 300,
        "data_types": ["price", "volume", "orderbook"],
        "update_frequency": "1s"
    }

# Example 5: Batch operations
@app.post("/api/batch/process")
@require_sio_payment(
    amount="5000000",  # 5 SIO for batch processing
    description="Batch AI processing service"
)
async def batch_process(request: Request):
    """Batch processing with bulk pricing"""
    body = await request.json()
    items = body.get("items", [])
    
    # Process each item
    results = []
    for item in items:
        results.append({
            "id": item.get("id"),
            "processed": True,
            "result": f"processed_{item.get('id')}",
            "confidence": 0.95
        })
    
    return {
        "batch_id": "batch_123",
        "total_items": len(items),
        "results": results,
        "cost_per_item": 5000000 // max(len(items), 1),
        "total_cost": 5000000
    }

# Example 6: Staking discount integration
@app.get("/api/staking/discount-rate")
async def get_discount_rate(request: Request):
    """Get discount rate based on staking tier"""
    # This would integrate with the staking system
    wallet = request.headers.get("X-Wallet-Address")
    
    # Mock staking data
    staking_tiers = {
        "bronze": 0.05,  # 5% discount
        "silver": 0.10,  # 10% discount
        "gold": 0.15,    # 15% discount
        "platinum": 0.20 # 20% discount
    }
    
    # In production, query actual staking data
    user_tier = "silver"  # Mock
    discount = staking_tiers.get(user_tier, 0)
    
    return {
        "wallet": wallet,
        "tier": user_tier,
        "discount_rate": discount,
        "next_tier": "gold",
        "required_stake": "10000000000"  # 10,000 SIO
    }

# Example 7: Payment verification endpoint
@app.post("/api/verify-payment")
async def verify_payment(request: Request):
    """Verify S-IO payment without processing"""
    payment_header = request.headers.get("X-SIO-PAYMENT")
    
    if not payment_header:
        raise HTTPException(status_code=400, detail="No payment header provided")
    
    # This would use the SIO protocol handler to verify
    return {
        "valid": True,
        "payment_id": "payment_123",
        "amount": "1000000",
        "payer": "UserWallet123...",
        "verified_at": "2024-01-01T12:00:00Z"
    }

# Example 8: Resource discovery
@app.get("/api/discover/resources")
async def discover_resources():
    """Discover available S-IO protocol resources"""
    return {
        "protocol": "s-io",
        "version": 1,
        "resources": [
            {
                "endpoint": "/api/premium-data",
                "cost": "1000000",
                "description": "Premium AI trading data",
                "method": "GET"
            },
            {
                "endpoint": "/api/neural/analysis/{complexity}",
                "cost": "500000-2500000",
                "description": "Neural network analysis",
                "method": "GET"
            },
            {
                "endpoint": "/api/agent/communicate",
                "cost": "250000",
                "description": "Agent communication service",
                "method": "POST"
            }
        ]
    }

# Error handler for payment failures
@app.exception_handler(402)
async def payment_required_handler(request: Request, exc):
    return JSONResponse(
        status_code=402,
        content={
            "error": "SIO payment required",
            "protocol": "s-io",
            "version": 1,
            "message": "This resource requires SIO token payment"
        }
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)