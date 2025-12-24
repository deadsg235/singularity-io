from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import json
import time
from typing import Dict, Any, Optional

router = APIRouter()

class StakeRequest(BaseModel):
    wallet: str
    amount: float
    pool_type: str = "standard"  # standard, lp, revenue_share

class UnstakeRequest(BaseModel):
    wallet: str
    amount: float
    pool_type: str = "standard"

class ClaimRequest(BaseModel):
    wallet: str
    pool_type: str = "standard"

# In-memory staking data (would be database in production)
staking_pools = {
    "standard": {"apy": 24.5, "total_staked": 18500000, "lock_period": 0},
    "lp": {"apy": 45.2, "total_staked": 5200000, "lock_period": 30},
    "revenue_share": {"apy": 18.7, "total_staked": 12100000, "lock_period": 90}
}

user_stakes = {}  # wallet -> {pool_type: {amount, timestamp, rewards}}

@router.post("/api/sio/stake")
async def stake_tokens(request: StakeRequest):
    """Stake S-IO tokens using S-IO Protocol"""
    try:
        if request.amount <= 0:
            raise HTTPException(status_code=400, detail="Invalid stake amount")
        
        if request.pool_type not in staking_pools:
            raise HTTPException(status_code=400, detail="Invalid pool type")
        
        # Initialize user stakes if not exists
        if request.wallet not in user_stakes:
            user_stakes[request.wallet] = {}
        
        if request.pool_type not in user_stakes[request.wallet]:
            user_stakes[request.wallet][request.pool_type] = {
                "amount": 0,
                "timestamp": time.time(),
                "rewards": 0
            }
        
        # Update stake
        user_stakes[request.wallet][request.pool_type]["amount"] += request.amount
        user_stakes[request.wallet][request.pool_type]["timestamp"] = time.time()
        
        # Update pool totals
        staking_pools[request.pool_type]["total_staked"] += request.amount
        
        # Generate S-IO transaction signature
        signature = f"sio_stake_{int(time.time())}_{hash(request.wallet)}"[:64]
        
        return {
            "success": True,
            "signature": signature,
            "message": f"Staked {request.amount} S-IO tokens",
            "pool": request.pool_type,
            "apy": staking_pools[request.pool_type]["apy"],
            "protocol": "S-IO"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/sio/unstake")
async def unstake_tokens(request: UnstakeRequest):
    """Unstake S-IO tokens using S-IO Protocol"""
    try:
        if request.wallet not in user_stakes or request.pool_type not in user_stakes[request.wallet]:
            raise HTTPException(status_code=400, detail="No stake found")
        
        user_stake = user_stakes[request.wallet][request.pool_type]
        
        if request.amount > user_stake["amount"]:
            raise HTTPException(status_code=400, detail="Insufficient staked amount")
        
        # Check lock period
        pool = staking_pools[request.pool_type]
        if pool["lock_period"] > 0:
            lock_end = user_stake["timestamp"] + (pool["lock_period"] * 24 * 3600)
            if time.time() < lock_end:
                raise HTTPException(status_code=400, detail=f"Tokens locked for {pool['lock_period']} days")
        
        # Update stake
        user_stake["amount"] -= request.amount
        staking_pools[request.pool_type]["total_staked"] -= request.amount
        
        signature = f"sio_unstake_{int(time.time())}_{hash(request.wallet)}"[:64]
        
        return {
            "success": True,
            "signature": signature,
            "message": f"Unstaked {request.amount} S-IO tokens",
            "pool": request.pool_type,
            "protocol": "S-IO"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/sio/claim-rewards")
async def claim_rewards(request: ClaimRequest):
    """Claim staking rewards using S-IO Protocol"""
    try:
        if request.wallet not in user_stakes or request.pool_type not in user_stakes[request.wallet]:
            raise HTTPException(status_code=400, detail="No stake found")
        
        user_stake = user_stakes[request.wallet][request.pool_type]
        
        # Calculate rewards
        time_staked = time.time() - user_stake["timestamp"]
        apy = staking_pools[request.pool_type]["apy"] / 100
        rewards = (user_stake["amount"] * apy * time_staked) / (365 * 24 * 3600)
        
        total_rewards = user_stake["rewards"] + rewards
        
        if total_rewards <= 0:
            raise HTTPException(status_code=400, detail="No rewards to claim")
        
        # Reset rewards
        user_stake["rewards"] = 0
        user_stake["timestamp"] = time.time()
        
        signature = f"sio_claim_{int(time.time())}_{hash(request.wallet)}"[:64]
        
        return {
            "success": True,
            "signature": signature,
            "rewards": total_rewards,
            "message": f"Claimed {total_rewards:.6f} S-IO rewards",
            "pool": request.pool_type,
            "protocol": "S-IO"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/sio/staking-info/{wallet}")
async def get_staking_info(wallet: str):
    """Get user staking information"""
    try:
        if wallet not in user_stakes:
            return {"stakes": {}, "total_staked": 0, "total_rewards": 0}
        
        stakes = {}
        total_staked = 0
        total_rewards = 0
        
        for pool_type, stake_data in user_stakes[wallet].items():
            # Calculate current rewards
            time_staked = time.time() - stake_data["timestamp"]
            apy = staking_pools[pool_type]["apy"] / 100
            current_rewards = (stake_data["amount"] * apy * time_staked) / (365 * 24 * 3600)
            
            stakes[pool_type] = {
                "amount": stake_data["amount"],
                "rewards": stake_data["rewards"] + current_rewards,
                "apy": staking_pools[pool_type]["apy"],
                "lock_period": staking_pools[pool_type]["lock_period"]
            }
            
            total_staked += stake_data["amount"]
            total_rewards += stake_data["rewards"] + current_rewards
        
        return {
            "stakes": stakes,
            "total_staked": total_staked,
            "total_rewards": total_rewards,
            "protocol": "S-IO"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/sio/pools")
async def get_staking_pools():
    """Get available staking pools"""
    return {
        "pools": staking_pools,
        "protocol": "S-IO",
        "version": "1.0"
    }