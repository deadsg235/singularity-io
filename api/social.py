from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import json
import os
from datetime import datetime

router = APIRouter()

# Data models
class TradeSignal(BaseModel):
    trader: str
    action: str
    token: str
    price: str
    confidence: int
    timestamp: datetime

class CommunityPost(BaseModel):
    user: str
    content: str
    likes: int = 0
    timestamp: datetime

class FollowRequest(BaseModel):
    trader_name: str
    wallet: str

class PostRequest(BaseModel):
    content: str
    wallet: str

# In-memory storage (replace with database in production)
trading_signals = []
community_posts = []
followers = {}  # {wallet: [trader_names]}
trader_stats = {
    'CryptoKing': {'roi': 156.7, 'followers': 2847, 'verified': True},
    'SolanaWhale': {'roi': 134.2, 'followers': 1923, 'verified': True},
    'DeFiMaster': {'roi': 98.5, 'followers': 1456, 'verified': False}
}

@router.get("/api/social/traders")
async def get_top_traders():
    """Get top performing traders"""
    return {
        "traders": [
            {"name": name, **stats, "avatar": "👑" if name == "CryptoKing" else "🐋" if name == "SolanaWhale" else "🚀"}
            for name, stats in trader_stats.items()
        ]
    }

@router.get("/api/social/signals")
async def get_trading_signals():
    """Get latest trading signals"""
    return {"signals": trading_signals[-10:]}  # Last 10 signals

@router.get("/api/social/posts")
async def get_community_posts():
    """Get community posts"""
    return {"posts": community_posts[-20:]}  # Last 20 posts

@router.post("/api/social/follow")
async def follow_trader(request: FollowRequest):
    """Follow a trader"""
    if request.wallet not in followers:
        followers[request.wallet] = []
    
    if request.trader_name not in followers[request.wallet]:
        followers[request.wallet].append(request.trader_name)
        trader_stats[request.trader_name]['followers'] += 1
        return {"success": True, "message": f"Now following {request.trader_name}"}
    
    return {"success": False, "message": "Already following this trader"}

@router.post("/api/social/unfollow")
async def unfollow_trader(request: FollowRequest):
    """Unfollow a trader"""
    if request.wallet in followers and request.trader_name in followers[request.wallet]:
        followers[request.wallet].remove(request.trader_name)
        trader_stats[request.trader_name]['followers'] -= 1
        return {"success": True, "message": f"Unfollowed {request.trader_name}"}
    
    return {"success": False, "message": "Not following this trader"}

@router.post("/api/social/post")
async def create_post(request: PostRequest):
    """Create a community post"""
    post = CommunityPost(
        user=f"{request.wallet[:4]}...{request.wallet[-4:]}",
        content=request.content,
        timestamp=datetime.now()
    )
    community_posts.append(post)
    return {"success": True, "message": "Post created successfully"}

@router.get("/api/social/following/{wallet}")
async def get_following(wallet: str):
    """Get traders that a wallet is following"""
    return {"following": followers.get(wallet, [])}

@router.post("/api/social/copy-trade")
async def execute_copy_trade(trade_data: dict):
    """Execute a copy trade"""
    # This would integrate with Jupiter API for actual trading
    # For now, return success simulation
    return {
        "success": True,
        "transaction_id": "simulated_tx_" + str(datetime.now().timestamp()),
        "message": f"Copy trade executed: {trade_data['action']} {trade_data['token']}"
    }