from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import requests
from typing import List, Dict
from datetime import datetime, timedelta

router = APIRouter()

class PortfolioRequest(BaseModel):
    wallet_address: str

# Mock price data - in production would use real price feeds
token_prices = {
    'So11111111111111111111111111111111111111112': 188.50,  # SOL
    'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 1.00,   # USDC
    '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R': 3.45,   # RAY
    'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE': 2.40    # ORCA
}

@router.get("/api/portfolio/{wallet_address}")
async def get_portfolio(wallet_address: str):
    """Get portfolio overview for a wallet"""
    try:
        # Get token balances
        payload = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "getTokenAccountsByOwner",
            "params": [
                wallet_address,
                {"programId": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"},
                {"encoding": "jsonParsed"}
            ]
        }
        
        response = requests.post("https://api.mainnet-beta.solana.com", json=payload)
        result = response.json()
        
        if "error" in result:
            raise HTTPException(400, f"RPC Error: {result['error']['message']}")
        
        token_accounts = result["result"]["value"]
        holdings = []
        total_value = 0
        
        # Add SOL balance
        sol_payload = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "getBalance",
            "params": [wallet_address]
        }
        
        sol_response = requests.post("https://api.mainnet-beta.solana.com", json=sol_payload)
        sol_result = sol_response.json()
        
        if "result" in sol_result:
            sol_balance = sol_result["result"]["value"] / 1e9
            sol_value = sol_balance * token_prices.get('So11111111111111111111111111111111111111112', 188.50)
            total_value += sol_value
            
            holdings.append({
                "symbol": "SOL",
                "mint": "So11111111111111111111111111111111111111112",
                "amount": sol_balance,
                "value": sol_value,
                "price": token_prices.get('So11111111111111111111111111111111111111112', 188.50),
                "change_24h": 5.2  # Mock data
            })
        
        # Process token accounts
        for account in token_accounts:
            account_data = account["account"]["data"]["parsed"]["info"]
            token_amount = account_data["tokenAmount"]
            mint = account_data["mint"]
            
            if float(token_amount["amount"]) > 0:
                amount = float(token_amount["uiAmount"]) if token_amount["uiAmount"] else 0
                price = token_prices.get(mint, 0)
                value = amount * price
                total_value += value
                
                holdings.append({
                    "symbol": get_token_symbol(mint),
                    "mint": mint,
                    "amount": amount,
                    "value": value,
                    "price": price,
                    "change_24h": (hash(mint) % 20) - 10  # Mock change
                })
        
        # Calculate daily change (mock)
        daily_change = total_value * 0.05  # 5% mock change
        
        return {
            "wallet": wallet_address,
            "total_value": total_value,
            "daily_change": daily_change,
            "daily_change_percent": (daily_change / total_value * 100) if total_value > 0 else 0,
            "asset_count": len(holdings),
            "holdings": holdings,
            "updated_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(500, f"Failed to get portfolio: {str(e)}")

@router.get("/api/portfolio/performance/{wallet_address}")
async def get_portfolio_performance(wallet_address: str, days: int = 30):
    """Get portfolio performance history"""
    # Generate mock performance data
    performance_data = []
    base_value = 5000
    
    for i in range(days):
        date = datetime.now() - timedelta(days=days-i)
        # Simulate portfolio growth with some volatility
        value = base_value * (1 + 0.002 * i + (hash(str(date)) % 100 - 50) / 1000)
        
        performance_data.append({
            "date": date.isoformat(),
            "value": value,
            "change": (value - base_value) / base_value * 100
        })
    
    return {
        "wallet": wallet_address,
        "performance": performance_data,
        "period_days": days
    }

def get_token_symbol(mint: str) -> str:
    """Get token symbol from mint address"""
    symbol_map = {
        'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 'USDC',
        '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R': 'RAY',
        'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE': 'ORCA',
        'So11111111111111111111111111111111111111112': 'SOL'
    }
    return symbol_map.get(mint, 'Unknown')