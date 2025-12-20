"""
Production Deployment - FastAPI app with all functionality
"""

from fastapi import FastAPI, WebSocket, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import uvicorn
import asyncio
from typing import Dict

from wallet_adapter import WalletAdapter
from sio_staking import SIOStaking
from wallet_api import router as wallet_router
from agent_controller import AgentController

app = FastAPI(
    title="Singularity Agent System",
    description="Production deployment for SIO trading agents",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global instances
wallet_adapter = WalletAdapter()
sio_staking = SIOStaking()
agent_controller = AgentController()

# Include wallet API routes
app.include_router(wallet_router)

@app.on_event("startup")
async def startup():
    """Initialize on startup"""
    await agent_controller.initialize()
    print("🚀 Singularity Agent System started")

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "name": "Singularity Agent System",
        "version": "1.0.0",
        "status": "running",
        "features": ["wallet_adapter", "sio_staking", "trading_agents"]
    }

# Wallet Adapter Endpoints
@app.post("/api/wallet/connect")
async def connect_wallet(data: Dict):
    """Connect wallet"""
    try:
        wallet_info = await wallet_adapter.connect_wallet(
            data["adapter_name"], 
            data["address"]
        )
        return {"success": True, "wallet": wallet_info.__dict__}
    except Exception as e:
        raise HTTPException(400, str(e))

@app.post("/api/wallet/disconnect")
async def disconnect_wallet():
    """Disconnect wallet"""
    wallet_adapter.disconnect_wallet()
    return {"success": True}

@app.get("/api/wallet/connected")
async def get_connected_wallet():
    """Get connected wallet"""
    wallet = wallet_adapter.get_connected_wallet()
    return {"wallet": wallet.__dict__ if wallet else None}

# Staking Endpoints
@app.get("/api/staking/info/{wallet_address}")
async def get_staking_info(wallet_address: str):
    """Get staking info"""
    return await sio_staking.get_staking_info(wallet_address)

@app.post("/api/staking/stake")
async def stake_tokens(data: Dict):
    """Stake tokens"""
    return await sio_staking.stake_tokens(data["wallet"], data["amount"])

@app.post("/api/staking/unstake")
async def unstake_tokens(data: Dict):
    """Unstake tokens"""
    return await sio_staking.unstake_tokens(data["wallet"], data["amount"])

@app.post("/api/staking/claim")
async def claim_rewards(data: Dict):
    """Claim rewards"""
    return await sio_staking.claim_rewards(data["wallet"])

@app.get("/api/staking/stats")
async def get_staking_stats():
    """Get staking statistics"""
    return sio_staking.get_total_staked()

# Agent Endpoints
@app.post("/api/agents/deploy")
async def deploy_agent(data: Dict):
    """Deploy trading agent"""
    if data["strategy"] == "dca":
        agent_id = await agent_controller.deploy_dca_agent(
            name=data["name"],
            tokens=data["tokens"],
            dca_amount=data["amount"],
            interval_seconds=data["interval"],
            enable_neural=data.get("neural", False)
        )
        return {"success": True, "agent_id": agent_id}
    else:
        raise HTTPException(400, f"Strategy {data['strategy']} not implemented")

@app.get("/api/agents/{agent_id}/status")
async def get_agent_status(agent_id: str):
    """Get agent status"""
    status = await agent_controller.get_agent_status(agent_id)
    if not status:
        raise HTTPException(404, "Agent not found")
    return status

@app.post("/api/agents/{agent_id}/pause")
async def pause_agent(agent_id: str):
    """Pause agent"""
    success = await agent_controller.pause_agent(agent_id)
    return {"success": success}

@app.post("/api/agents/{agent_id}/resume")
async def resume_agent(agent_id: str):
    """Resume agent"""
    success = await agent_controller.resume_agent(agent_id)
    return {"success": success}

@app.delete("/api/agents/{agent_id}")
async def stop_agent(agent_id: str):
    """Stop agent"""
    success = await agent_controller.stop_agent(agent_id)
    return {"success": success}

@app.get("/api/agents/status")
async def get_all_agents():
    """Get all agents status"""
    return await agent_controller.get_all_agents_status()

if __name__ == "__main__":
    uvicorn.run(
        "production_app:app",
        host="0.0.0.0",
        port=8000,
        reload=False,
        workers=1
    )