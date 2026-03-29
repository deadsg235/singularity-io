from fastapi import APIRouter
from typing import Dict, List
from datetime import datetime, timedelta
import random

router = APIRouter()

# Mock trading data - in production this would come from a database
trading_data = {
    'daily': [
        {'rank': 1, 'name': 'CryptoKing', 'pnl': 2847.32, 'roi': 24.3, 'trades': 15, 'winRate': 86.7, 'followers': 1247},
        {'rank': 2, 'name': 'SolanaWhale', 'pnl': 1923.45, 'roi': 19.7, 'trades': 23, 'winRate': 78.3, 'followers': 892},
        {'rank': 3, 'name': 'DeFiMaster', 'pnl': 1456.78, 'roi': 15.2, 'trades': 31, 'winRate': 74.2, 'followers': 634},
        {'rank': 4, 'name': 'TokenHunter', 'pnl': 1234.56, 'roi': 12.8, 'trades': 18, 'winRate': 72.2, 'followers': 456},
        {'rank': 5, 'name': 'MemeTrader', 'pnl': 987.65, 'roi': 11.4, 'trades': 27, 'winRate': 70.4, 'followers': 321}
    ],
    'weekly': [
        {'rank': 1, 'name': 'CryptoKing', 'pnl': 15847.32, 'roi': 124.3, 'trades': 89, 'winRate': 84.3, 'followers': 1247},
        {'rank': 2, 'name': 'DeFiMaster', 'pnl': 12456.78, 'roi': 98.7, 'trades': 156, 'winRate': 76.9, 'followers': 634},
        {'rank': 3, 'name': 'SolanaWhale', 'pnl': 9823.45, 'roi': 87.2, 'trades': 134, 'winRate': 73.1, 'followers': 892}
    ],
    'monthly': [
        {'rank': 1, 'name': 'CryptoKing', 'pnl': 67847.32, 'roi': 456.7, 'trades': 423, 'winRate': 82.7, 'followers': 1247},
        {'rank': 2, 'name': 'DeFiMaster', 'pnl': 54321.09, 'roi': 387.4, 'trades': 567, 'winRate': 78.2, 'followers': 634}
    ],
    'all-time': [
        {'rank': 1, 'name': 'CryptoKing', 'pnl': 234567.89, 'roi': 1234.5, 'trades': 2341, 'winRate': 81.4, 'followers': 1247},
        {'rank': 2, 'name': 'DeFiMaster', 'pnl': 187654.32, 'roi': 987.6, 'trades': 1876, 'winRate': 77.8, 'followers': 634}
    ]
}

strategies_data = [
    {'name': 'DCA Bot', 'roi': 24.3, 'users': 156},
    {'name': 'Momentum Trading', 'roi': 19.7, 'users': 89},
    {'name': 'Arbitrage', 'roi': 15.2, 'users': 234},
    {'name': 'Grid Trading', 'roi': 12.8, 'users': 67}
]

market_leaders = [
    {'token': 'SOL', 'leader': 'CryptoKing', 'pnl': 2800},
    {'token': 'USDC', 'leader': 'DeFiMaster', 'pnl': 1900},
    {'token': 'RAY', 'leader': 'SolanaWhale', 'pnl': 1500},
    {'token': 'ORCA', 'leader': 'TokenHunter', 'pnl': 1200}
]

@router.get("/api/leaderboard/{period}")
async def get_leaderboard(period: str):
    """Get leaderboard for specified time period"""
    if period not in trading_data:
        period = 'daily'
    
    # Add some randomness to simulate live data
    data = trading_data[period].copy()
    for trader in data:
        trader['pnl'] += random.uniform(-50, 50)
        trader['roi'] += random.uniform(-1, 1)
    
    return {
        "period": period,
        "leaderboard": data,
        "updated_at": datetime.now().isoformat()
    }

@router.get("/api/leaderboard/strategies")
async def get_top_strategies():
    """Get top performing trading strategies"""
    # Add randomness
    data = strategies_data.copy()
    for strategy in data:
        strategy['roi'] += random.uniform(-2, 2)
        strategy['users'] += random.randint(-5, 10)
    
    return {
        "strategies": data,
        "updated_at": datetime.now().isoformat()
    }

@router.get("/api/leaderboard/market-leaders")
async def get_market_leaders():
    """Get market leaders by token"""
    # Add randomness
    data = market_leaders.copy()
    for leader in data:
        leader['pnl'] += random.uniform(-100, 200)
    
    return {
        "market_leaders": data,
        "updated_at": datetime.now().isoformat()
    }

@router.post("/api/leaderboard/follow/{trader_name}")
async def follow_trader_leaderboard(trader_name: str, wallet_data: dict):
    """Follow a trader from leaderboard"""
    # This would integrate with the social trading system
    return {
        "success": True,
        "message": f"Now following {trader_name}! Copy trading activated.",
        "trader": trader_name,
        "wallet": wallet_data.get("wallet")
    }