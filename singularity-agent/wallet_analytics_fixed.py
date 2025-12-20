"""
Fixed Wallet Analytics - Using cached RPC with proper error handling
"""

from fastapi import APIRouter, HTTPException
import asyncio
from sio_balance import SIOBalanceClient

router = APIRouter()

@router.get("/api/wallet/analytics/{wallet_address}")
async def get_wallet_analytics(wallet_address: str):
    """Get wallet analytics with proper error handling"""
    try:
        client = SIOBalanceClient()
        
        # Get SIO balance
        sio_result = await client.get_sio_balance(wallet_address)
        sio_balance = sio_result.get("balance", 0.0)
        
        # Get SOL balance
        sol_balance = 0.0
        try:
            sol_result = await client._rpc_call("getBalance", [wallet_address])
            if "result" in sol_result and "value" in sol_result["result"]:
                sol_balance = sol_result["result"]["value"] / 1e9
        except:
            sol_balance = 0.0
        
        return {
            "wallet": wallet_address,
            "sol_balance": sol_balance,
            "sio_balance": sio_balance,
            "total_tokens": 1 if sio_balance > 0 else 0,
            "tokens": [
                {
                    "mint": "Fuj6EDWQHBnQ3eEvYDujNQ4rPLSkhm3pBySbQ79Bpump",
                    "symbol": "SIO",
                    "amount": sio_balance,
                    "decimals": 6
                }
            ] if sio_balance > 0 else [],
            "timestamp": "now"
        }
        
    except Exception as e:
        return {
            "wallet": wallet_address,
            "sol_balance": 0.0,
            "sio_balance": 0.0,
            "total_tokens": 0,
            "tokens": [],
            "error": str(e),
            "timestamp": "now"
        }