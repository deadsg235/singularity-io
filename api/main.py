from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from neural_network import dqn

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
    return dqn.get_state()

@app.post("/api/neural/update")
def update_neural_network():
    dqn.update()
    return {"status": "updated"}
