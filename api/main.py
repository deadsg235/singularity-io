from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

try:
    from neural_network import dqn
    NEURAL_AVAILABLE = True
except Exception as e:
    print(f"Neural network not available: {e}")
    NEURAL_AVAILABLE = False
    dqn = None

# Import S-IO protocol
try:
    from sio_middleware import require_sio_payment, sio_protected
    from sio_protocol import SIODataTransmission
    SIO_AVAILABLE = True
except ImportError as e:
    print(f"S-IO protocol not available: {e}")
    SIO_AVAILABLE = False

# Import working API routers
try:
    from sio_token import router as sio_router
    from wallet_analytics import router as wallet_analytics_router
    from revenue import router as revenue_router
    from social import router as social_router
    from staking import router as staking_router
    from sio_swap import router as swap_router
    from sio_staking import router as sio_staking_router
    from guardian_analytics import router as guardian_router
except ImportError as e:
    print(f"Some API modules not available: {e}")

app = FastAPI(
    title="Singularity.io API",
    description="Backend API for Singularity.io - Solana blockchain integration platform",
    version="0.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include working API routers
try:
    app.include_router(sio_router)
    app.include_router(wallet_analytics_router)
    app.include_router(revenue_router)
    app.include_router(social_router)
    app.include_router(staking_router)
    app.include_router(swap_router)
    app.include_router(sio_staking_router)
    app.include_router(guardian_router)
except NameError:
    pass  # Routers not available

@app.get("/")
def read_root():
    return {
        "name": "Singularity.io",
        "version": "0.1.0",
        "description": "Solana blockchain integration platform with SolFunMeme technology"
    }

@app.get("/api/health")
def health_check():
    return {"status": "healthy", "service": "singularity-api"}

@app.get("/api/network/stats")
def get_network_stats():
    return {
        "solana_network": "mainnet-beta",
        "connected_nodes": 0,
        "status": "initializing"
    }

@app.get("/api/solfunmeme/status")
def get_solfunmeme_status():
    return {
        "technology": "SolFunMeme",
        "status": "development",
        "phase": "Phase 1: Definition & Research"
    }

@app.get("/api/economy/overview")
def get_economy_overview():
    return {
        "token": "SFM",
        "total_supply": 0,
        "active_bounties": 0,
        "status": "pre-launch"
    }

@app.get("/api/neural/network")
@require_sio_payment(
    amount="500000",  # 0.5 SIO tokens
    description="Access to neural network state data"
) if SIO_AVAILABLE else lambda: None
def get_neural_network(request: Request = None):
    if not NEURAL_AVAILABLE or not dqn:
        return {"nodes": [], "connections": [], "layers": []}
    
    # Enhanced neural network data with S-IO protocol
    state = dqn.get_state()
    
    if SIO_AVAILABLE and request:
        # Wrap in S-IO data transmission
        transmission = SIODataTransmission(
            payment_proof=request.headers.get("X-SIO-PAYMENT", ""),
            data_type="json",
            data=state,
            metadata={
                "resource": "neural_network_state",
                "timestamp": "2024-01-01T12:00:00Z"
            }
        )
        return transmission.model_dump()
    
    return state

@app.post("/api/neural/update")
@require_sio_payment(
    amount="1000000",  # 1 SIO token
    description="Update neural network parameters"
) if SIO_AVAILABLE else lambda: None
def update_neural_network(request: Request = None):
    if NEURAL_AVAILABLE and dqn:
        dqn.update()
    return {"status": "updated", "protocol": "s-io" if SIO_AVAILABLE else "standard"}

# S-IO Protocol specific endpoints
if SIO_AVAILABLE:
    @app.get("/api/sio/premium-data")
    @require_sio_payment(
        amount="2000000",  # 2 SIO tokens
        description="Premium Singularity.io trading data"
    )
    async def get_premium_data(request: Request):
        """Premium trading data with S-IO payment"""
        return {
            "data": {
                "ai_predictions": {
                    "btc": {"trend": "bullish", "confidence": 0.87},
                    "eth": {"trend": "neutral", "confidence": 0.72},
                    "sol": {"trend": "bullish", "confidence": 0.91}
                },
                "market_signals": ["volume_spike", "rsi_oversold", "ma_crossover"],
                "risk_assessment": "moderate"
            },
            "timestamp": "2024-01-01T12:00:00Z",
            "source": "singularity-ai",
            "protocol": "s-io"
        }
    
    @app.get("/api/sio/agent-communication")
    @require_sio_payment(
        amount="750000",  # 0.75 SIO tokens
        description="Agent-to-agent communication service"
    )
    async def agent_communication(request: Request):
        """Secure agent communication with S-IO payment"""
        return {
            "service": "agent_communication",
            "status": "active",
            "endpoints": {
                "send_message": "/api/sio/agent/send",
                "receive_message": "/api/sio/agent/receive",
                "broadcast": "/api/sio/agent/broadcast"
            },
            "protocol": "s-io"
        }
    
    @app.get("/api/sio/discover")
    async def discover_sio_resources():
        """Discover available S-IO protocol resources"""
        return {
            "protocol": "s-io",
            "version": 1,
            "resources": [
                {
                    "endpoint": "/api/neural/network",
                    "cost": "500000",
                    "description": "Neural network state data",
                    "method": "GET"
                },
                {
                    "endpoint": "/api/neural/update",
                    "cost": "1000000",
                    "description": "Update neural network",
                    "method": "POST"
                },
                {
                    "endpoint": "/api/sio/premium-data",
                    "cost": "2000000",
                    "description": "Premium trading data",
                    "method": "GET"
                },
                {
                    "endpoint": "/api/sio/agent-communication",
                    "cost": "750000",
                    "description": "Agent communication service",
                    "method": "GET"
                }
            ]
        }
