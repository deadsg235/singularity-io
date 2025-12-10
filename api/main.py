from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

try:
    from neural_network import dqn
    NEURAL_AVAILABLE = True
except Exception as e:
    print(f"Neural network not available: {e}")
    NEURAL_AVAILABLE = False
    dqn = None

# Import API routers
try:
    from social import router as social_router
    from staking import router as staking_router
    from governance import router as governance_router
    from revenue import router as revenue_router
    from tokenomics import router as tokenomics_router
    from chat import router as chat_router
    from bot_chat import router as bot_chat_router
    from leaderboard import router as leaderboard_router
    from wallet import router as wallet_router
    from portfolio import router as portfolio_router
    from analytics import router as analytics_router
    from sio_token import router as sio_router
    from wallet_analytics import router as wallet_router
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

# Include API routers
try:
    app.include_router(social_router)
    app.include_router(staking_router)
    app.include_router(governance_router)
    app.include_router(revenue_router)
    app.include_router(tokenomics_router)
    app.include_router(chat_router)
    app.include_router(bot_chat_router)
    app.include_router(leaderboard_router)
    app.include_router(wallet_router)
    app.include_router(portfolio_router)
    app.include_router(analytics_router)
    app.include_router(sio_router)
    app.include_router(wallet_router)
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
def get_neural_network():
    if not NEURAL_AVAILABLE or not dqn:
        return {"nodes": [], "connections": [], "layers": []}
    return dqn.get_state()

@app.post("/api/neural/update")
def update_neural_network():
    if NEURAL_AVAILABLE and dqn:
        dqn.update()
    return {"status": "updated"}
