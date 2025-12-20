"""
SIO Staking - Staking functionality for SIO tokens
"""

import asyncio
from typing import Dict, List
from dataclasses import dataclass
from sio_balance_simple import SIOBalanceClient

@dataclass
class StakeInfo:
    """Staking information"""
    wallet: str
    staked_amount: float
    rewards: float
    stake_time: int
    apy: float = 12.0  # 12% APY

class SIOStaking:
    """SIO token staking system"""
    
    def __init__(self):
        self.client = SIOBalanceClient()
        self.stakes: Dict[str, StakeInfo] = {}
        self.min_stake = 1000.0  # Minimum 1000 SIO to stake
    
    async def get_staking_info(self, wallet_address: str) -> Dict:
        """Get staking information for wallet"""
        balance_result = await self.client.get_sio_balance(wallet_address)
        balance = balance_result.get("balance", 0.0)
        
        stake_info = self.stakes.get(wallet_address)
        
        return {
            "wallet": wallet_address,
            "balance": balance,
            "can_stake": balance >= self.min_stake,
            "min_stake": self.min_stake,
            "current_stake": stake_info.staked_amount if stake_info else 0.0,
            "rewards": stake_info.rewards if stake_info else 0.0,
            "apy": 12.0
        }
    
    async def stake_tokens(self, wallet_address: str, amount: float) -> Dict:
        """Stake SIO tokens"""
        if amount < self.min_stake:
            return {"success": False, "error": f"Minimum stake is {self.min_stake} SIO"}
        
        balance_result = await self.client.get_sio_balance(wallet_address)
        balance = balance_result.get("balance", 0.0)
        
        if balance < amount:
            return {"success": False, "error": "Insufficient balance"}
        
        # Create or update stake
        current_time = int(asyncio.get_event_loop().time())
        
        if wallet_address in self.stakes:
            # Add to existing stake
            self.stakes[wallet_address].staked_amount += amount
        else:
            # Create new stake
            self.stakes[wallet_address] = StakeInfo(
                wallet=wallet_address,
                staked_amount=amount,
                rewards=0.0,
                stake_time=current_time
            )
        
        return {
            "success": True,
            "staked_amount": amount,
            "total_staked": self.stakes[wallet_address].staked_amount,
            "transaction": f"stake_tx_{wallet_address[:8]}_{current_time}"
        }
    
    async def unstake_tokens(self, wallet_address: str, amount: float) -> Dict:
        """Unstake SIO tokens"""
        if wallet_address not in self.stakes:
            return {"success": False, "error": "No active stake found"}
        
        stake_info = self.stakes[wallet_address]
        
        if amount > stake_info.staked_amount:
            return {"success": False, "error": "Insufficient staked amount"}
        
        # Calculate rewards
        current_time = int(asyncio.get_event_loop().time())
        time_staked = current_time - stake_info.stake_time
        rewards = (stake_info.staked_amount * 0.12 * time_staked) / (365 * 24 * 3600)  # 12% APY
        
        # Update stake
        stake_info.staked_amount -= amount
        stake_info.rewards += rewards
        
        if stake_info.staked_amount <= 0:
            del self.stakes[wallet_address]
        
        return {
            "success": True,
            "unstaked_amount": amount,
            "rewards": rewards,
            "total_received": amount + rewards,
            "transaction": f"unstake_tx_{wallet_address[:8]}_{current_time}"
        }
    
    async def claim_rewards(self, wallet_address: str) -> Dict:
        """Claim staking rewards"""
        if wallet_address not in self.stakes:
            return {"success": False, "error": "No active stake found"}
        
        stake_info = self.stakes[wallet_address]
        
        # Calculate current rewards
        current_time = int(asyncio.get_event_loop().time())
        time_staked = current_time - stake_info.stake_time
        rewards = (stake_info.staked_amount * 0.12 * time_staked) / (365 * 24 * 3600)
        
        # Reset stake time
        stake_info.stake_time = current_time
        stake_info.rewards = 0.0
        
        return {
            "success": True,
            "rewards_claimed": rewards,
            "transaction": f"claim_tx_{wallet_address[:8]}_{current_time}"
        }
    
    def get_total_staked(self) -> Dict:
        """Get total staking statistics"""
        total_staked = sum(stake.staked_amount for stake in self.stakes.values())
        total_stakers = len(self.stakes)
        
        return {
            "total_staked": total_staked,
            "total_stakers": total_stakers,
            "apy": 12.0,
            "min_stake": self.min_stake
        }