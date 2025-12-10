from fastapi import APIRouter
from typing import List, Dict
from datetime import datetime, timedelta
import random
import math

router = APIRouter()

@router.get("/api/analytics/price/{symbol}")
async def get_price_data(symbol: str, timeframe: str = "1D"):
    """Get price data for a token"""
    
    # Determine data points based on timeframe
    if timeframe == "1H":
        points = 60
        interval_minutes = 1
    elif timeframe == "1D":
        points = 24
        interval_minutes = 60
    elif timeframe == "1W":
        points = 7
        interval_minutes = 24 * 60
    else:  # 1M
        points = 30
        interval_minutes = 24 * 60
    
    # Generate mock price data
    base_price = get_base_price(symbol)
    price_data = []
    
    for i in range(points):
        timestamp = datetime.now() - timedelta(minutes=(points - i) * interval_minutes)
        
        # Add some realistic price movement
        volatility = 0.02 if symbol == "SOL" else 0.05
        change = math.sin(i * 0.1) * volatility + random.uniform(-volatility/2, volatility/2)
        price = base_price * (1 + change * (i / points))
        
        volume = random.uniform(10000000, 100000000)
        
        price_data.append({
            "timestamp": timestamp.isoformat(),
            "price": round(price, 4),
            "volume": round(volume, 2)
        })
    
    return {
        "symbol": symbol,
        "timeframe": timeframe,
        "data": price_data,
        "current_price": price_data[-1]["price"],
        "change_24h": ((price_data[-1]["price"] - price_data[0]["price"]) / price_data[0]["price"]) * 100
    }

@router.get("/api/analytics/market-stats")
async def get_market_stats():
    """Get overall market statistics"""
    
    tokens = ["SOL", "USDC", "RAY", "ORCA", "MNGO"]
    market_data = []
    
    for token in tokens:
        base_price = get_base_price(token)
        change_24h = random.uniform(-15, 15)
        volume_24h = random.uniform(5000000, 500000000)
        
        market_data.append({
            "symbol": token,
            "price": base_price,
            "change_24h": round(change_24h, 2),
            "volume_24h": round(volume_24h, 2),
            "market_cap": round(base_price * get_supply(token), 2)
        })
    
    total_market_cap = sum(token["market_cap"] for token in market_data)
    total_volume = sum(token["volume_24h"] for token in market_data)
    
    return {
        "tokens": market_data,
        "total_market_cap": total_market_cap,
        "total_volume_24h": total_volume,
        "updated_at": datetime.now().isoformat()
    }

@router.get("/api/analytics/volume")
async def get_volume_analysis():
    """Get volume analysis data"""
    
    # Generate 24 hours of volume data
    volume_data = []
    
    for i in range(24):
        timestamp = datetime.now() - timedelta(hours=24-i)
        
        # Simulate trading volume patterns (higher during certain hours)
        base_volume = 50000000
        hour_multiplier = 1 + 0.5 * math.sin((i - 6) * math.pi / 12)  # Peak around noon UTC
        volume = base_volume * hour_multiplier * random.uniform(0.7, 1.3)
        
        volume_data.append({
            "timestamp": timestamp.isoformat(),
            "volume": round(volume, 2),
            "trades": random.randint(1000, 5000)
        })
    
    return {
        "volume_data": volume_data,
        "total_volume_24h": sum(v["volume"] for v in volume_data),
        "total_trades_24h": sum(v["trades"] for v in volume_data),
        "avg_trade_size": sum(v["volume"] for v in volume_data) / sum(v["trades"] for v in volume_data)
    }

@router.get("/api/analytics/top-tokens")
async def get_top_tokens(limit: int = 10):
    """Get top tokens by market cap"""
    
    tokens = [
        {"symbol": "SOL", "name": "Solana"},
        {"symbol": "USDC", "name": "USD Coin"},
        {"symbol": "RAY", "name": "Raydium"},
        {"symbol": "ORCA", "name": "Orca"},
        {"symbol": "MNGO", "name": "Mango"},
        {"symbol": "SRM", "name": "Serum"},
        {"symbol": "COPE", "name": "Cope"},
        {"symbol": "STEP", "name": "Step Finance"},
        {"symbol": "MEDIA", "name": "Media Network"},
        {"symbol": "ROPE", "name": "Rope Token"}
    ]
    
    top_tokens = []
    
    for i, token in enumerate(tokens[:limit]):
        price = get_base_price(token["symbol"])
        supply = get_supply(token["symbol"])
        market_cap = price * supply
        change_24h = random.uniform(-20, 20)
        volume_24h = random.uniform(1000000, 100000000)
        
        top_tokens.append({
            "rank": i + 1,
            "symbol": token["symbol"],
            "name": token["name"],
            "price": price,
            "market_cap": market_cap,
            "change_24h": round(change_24h, 2),
            "volume_24h": round(volume_24h, 2)
        })
    
    # Sort by market cap
    top_tokens.sort(key=lambda x: x["market_cap"], reverse=True)
    
    # Update ranks
    for i, token in enumerate(top_tokens):
        token["rank"] = i + 1
    
    return {
        "tokens": top_tokens,
        "updated_at": datetime.now().isoformat()
    }

def get_base_price(symbol: str) -> float:
    """Get base price for a token symbol"""
    prices = {
        "SOL": 188.50,
        "USDC": 1.00,
        "RAY": 3.45,
        "ORCA": 2.40,
        "MNGO": 0.045,
        "SRM": 0.85,
        "COPE": 0.12,
        "STEP": 0.08,
        "MEDIA": 0.25,
        "ROPE": 0.001
    }
    return prices.get(symbol, 1.0)

def get_supply(symbol: str) -> float:
    """Get circulating supply for a token"""
    supplies = {
        "SOL": 400000000,
        "USDC": 25000000000,
        "RAY": 555000000,
        "ORCA": 100000000,
        "MNGO": 10000000000,
        "SRM": 10000000000,
        "COPE": 166000000,
        "STEP": 1000000000,
        "MEDIA": 100000000,
        "ROPE": 1000000000000
    }
    return supplies.get(symbol, 1000000)