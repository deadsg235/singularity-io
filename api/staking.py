from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict
import json
from datetime import datetime, timedelta

router = APIRouter()

class StakeRequest(BaseModel):
    wallet: str
    amount: float

class UnstakeRequest(BaseModel):
    wallet: str
    amount: float

class ClaimRequest(BaseModel):
    wallet: str

# In-memory storage (replace with database in production)
staking_pools = {
    "sio_pool": {
        "name": "S-IO Pool",
        "apy": 24.5,
        "total_staked": 18500000,
        "min_stake": 100
    },
    "sio_sol_lp": {
        "name": "S-IO-SOL LP",
        "apy": 45.2,
        "total_staked": 5200000,
        "min_stake": 50
    }
}

user_stakes = {}  # {wallet: {pool: {amount, start_time, last_claim}}}

@router.get("/api/staking/pools")
async def get_staking_pools():
    """Get available staking pools"""
    return {"pools": staking_pools}

@router.get("/api/staking/user/{wallet}")
async def get_user_staking(wallet: str):
    """Get user's staking information"""
    if wallet not in user_stakes:
        return {
            "total_staked": 0,
            "pending_rewards": 0,
            "stakes": {}
        }
    
    total_staked = 0
    total_rewards = 0
    stakes = {}
    
    for pool_id, stake_info in user_stakes[wallet].items():
        pool = staking_pools[pool_id]
        amount = stake_info["amount"]
        start_time = stake_info["start_time"]
        last_claim = stake_info.get("last_claim", start_time)
        
        # Calculate rewards
        time_diff = (datetime.now() - last_claim).total_seconds()
        daily_rate = pool["apy"] / 100 / 365
        rewards = amount * daily_rate * (time_diff / 86400)
        
        total_staked += amount
        total_rewards += rewards
        
        stakes[pool_id] = {
            "pool_name": pool["name"],
            "amount": amount,
            "apy": pool["apy"],
            "pending_rewards": rewards,
            "start_time": start_time.isoformat()
        }
    
    return {
        "total_staked": total_staked,
        "pending_rewards": total_rewards,
        "stakes": stakes
    }

@router.post("/api/staking/stake")
async def stake_tokens(request: StakeRequest):
    """Stake S-IO tokens"""
    pool_id = "sio_pool"  # Default pool
    pool = staking_pools[pool_id]
    
    if request.amount < pool["min_stake"]:
        raise HTTPException(400, f"Minimum stake is {pool['min_stake']} S-IO")
    
    if request.wallet not in user_stakes:
        user_stakes[request.wallet] = {}
    
    if pool_id in user_stakes[request.wallet]:
        # Add to existing stake
        user_stakes[request.wallet][pool_id]["amount"] += request.amount
    else:
        # Create new stake
        user_stakes[request.wallet][pool_id] = {
            "amount": request.amount,
            "start_time": datetime.now(),
            "last_claim": datetime.now()
        }
    
    staking_pools[pool_id]["total_staked"] += request.amount
    
    return {
        "success": True,
        "message": f"Successfully staked {request.amount} S-IO tokens",
        "transaction_id": f"stake_{datetime.now().timestamp()}"
    }

@router.post("/api/staking/unstake")
async def unstake_tokens(request: UnstakeRequest):
    """Unstake S-IO tokens"""
    pool_id = "sio_pool"
    
    if request.wallet not in user_stakes or pool_id not in user_stakes[request.wallet]:
        raise HTTPException(400, "No tokens staked")
    
    stake_info = user_stakes[request.wallet][pool_id]
    
    if request.amount > stake_info["amount"]:
        raise HTTPException(400, "Cannot unstake more than staked amount")
    
    stake_info["amount"] -= request.amount
    staking_pools[pool_id]["total_staked"] -= request.amount
    
    if stake_info["amount"] == 0:
        del user_stakes[request.wallet][pool_id]
    
    return {
        "success": True,
        "message": f"Successfully unstaked {request.amount} S-IO tokens",
        "transaction_id": f"unstake_{datetime.now().timestamp()}"
    }

@router.post("/api/staking/claim")
async def claim_rewards(request: ClaimRequest):
    """Claim staking rewards"""
    if request.wallet not in user_stakes:
        raise HTTPException(400, "No staking positions found")
    
    total_claimed = 0
    
    for pool_id, stake_info in user_stakes[request.wallet].items():
        pool = staking_pools[pool_id]
        amount = stake_info["amount"]
        last_claim = stake_info.get("last_claim", stake_info["start_time"])
        
        # Calculate rewards
        time_diff = (datetime.now() - last_claim).total_seconds()
        daily_rate = pool["apy"] / 100 / 365
        rewards = amount * daily_rate * (time_diff / 86400)
        
        total_claimed += rewards
        stake_info["last_claim"] = datetime.now()
    
    return {
        "success": True,
        "claimed_amount": total_claimed,
        "message": f"Successfully claimed {total_claimed:.4f} S-IO rewards",
        "transaction_id": f"claim_{datetime.now().timestamp()}"
    }

@router.get("/api/staking/apy")
async def get_current_apy():
    """Get current APY rates"""
    return {
        "sio_pool_apy": staking_pools["sio_pool"]["apy"],
        "sio_sol_lp_apy": staking_pools["sio_sol_lp"]["apy"],
        "updated_at": datetime.now().isoformat()
    }