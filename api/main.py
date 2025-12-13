from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

# Import core modules
try:
    from neural_network import dqn
    NEURAL_AVAILABLE = True
except Exception as e:
    print(f"Neural network not available: {e}")
    NEURAL_AVAILABLE = False
    dqn = None

try:
    from solana_client import solana_client
    SOLANA_AVAILABLE = True
except Exception as e:
    print(f"Solana client not available: {e}")
    SOLANA_AVAILABLE = False
    solana_client = None

# Import API routers
routers_to_include = []
try:
    from sio_token import router as sio_router
    routers_to_include.append(sio_router)
except ImportError:
    pass

try:
    from wallet_analytics import router as wallet_analytics_router
    routers_to_include.append(wallet_analytics_router)
except ImportError:
    pass

try:
    from revenue import router as revenue_router
    routers_to_include.append(revenue_router)
except ImportError:
    pass

try:
    from social import router as social_router
    routers_to_include.append(social_router)
except ImportError:
    pass

try:
    from staking import router as staking_router
    routers_to_include.append(staking_router)
except ImportError:
    pass

app = FastAPI(
    title="Singularity.io API",
    description="Backend API for Singularity.io - Solana blockchain integration platform",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include available routers
for router in routers_to_include:
    app.include_router(router)

@app.get("/")
def read_root():
    return {
        "name": "Singularity.io",
        "version": "1.0.0",
        "description": "Solana blockchain integration platform with SolFunMeme technology",
        "status": "operational",
        "components": {
            "neural_network": NEURAL_AVAILABLE,
            "solana_client": SOLANA_AVAILABLE,
            "active_routers": len(routers_to_include)
        }
    }

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "singularity-api",
        "components": {
            "neural_network": "online" if NEURAL_AVAILABLE else "offline",
            "solana_client": "online" if SOLANA_AVAILABLE else "offline"
        }
    }

@app.get("/api/network/stats")
def get_network_stats():
    if SOLANA_AVAILABLE and solana_client:
        stats = solana_client.get_network_stats()
        return {
            "solana_network": "mainnet-beta",
            "connected": True,
            **stats
        }
    return {
        "solana_network": "mainnet-beta",
        "connected": False,
        "status": "client_unavailable"
    }

@app.get("/api/solfunmeme/status")
def get_solfunmeme_status():
    return {
        "technology": "SolFunMeme",
        "status": "operational",
        "phase": "Phase 1: Foundational Infrastructure",
        "introspector": "active",
        "formal_verification": "enabled"
    }

@app.get("/api/economy/overview")
def get_economy_overview():
    return {
        "token": "SIO",
        "total_supply": 1000000000,
        "circulating_supply": 0,
        "active_bounties": 0,
        "status": "pre-launch",
        "economy_phase": "initialization"
    }

@app.get("/api/neural/network")
def get_neural_network():
    if not NEURAL_AVAILABLE or not dqn:
        return {"nodes": [], "connections": [], "layers": [], "error": "neural_network_unavailable"}
    return dqn.get_state()

@app.post("/api/neural/update")
def update_neural_network():
    if NEURAL_AVAILABLE and dqn:
        dqn.update()
        return {"status": "updated", "timestamp": "now"}
    return {"status": "failed", "error": "neural_network_unavailable"}

@app.get("/api/wallet/balance/{address}")
def get_wallet_balance(address: str):
    if SOLANA_AVAILABLE and solana_client:
        balance = solana_client.get_balance(address)
        return {"address": address, "balance": balance, "currency": "SOL"}
    return {"address": address, "balance": 0.0, "currency": "SOL", "error": "client_unavailable"}

@app.get("/api/wallet/sio-balance/{address}")
def get_sio_balance(address: str):
    # S-IO token mint address (placeholder - replace with actual)
    sio_mint = os.getenv("SIO_TOKEN_MINT", "SIOTokenMintAddressHere")
    
    if SOLANA_AVAILABLE and solana_client:
        balance = solana_client.get_token_balance(address, sio_mint)
        return {"address": address, "balance": balance, "currency": "S-IO", "mint": sio_mint}
    return {"address": address, "balance": 0.0, "currency": "S-IO", "error": "client_unavailable"}

@app.get("/api/wallet/full-balance/{address}")
def get_full_wallet_balance(address: str):
    sol_balance = 0.0
    sio_balance = 0.0
    
    if SOLANA_AVAILABLE and solana_client:
        sol_balance = solana_client.get_balance(address)
        sio_mint = os.getenv("SIO_TOKEN_MINT", "SIOTokenMintAddressHere")
        sio_balance = solana_client.get_token_balance(address, sio_mint)
    
    return {
        "address": address,
        "balances": {
            "SOL": sol_balance,
            "S-IO": sio_balance
        },
        "status": "success" if SOLANA_AVAILABLE else "client_unavailable"
    }
