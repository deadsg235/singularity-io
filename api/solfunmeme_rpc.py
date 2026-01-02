from fastapi import APIRouter, HTTPException
import httpx
import asyncio
from typing import Dict, Optional
import json

router = APIRouter(prefix="/api/solfunmeme", tags=["SolFunMeme RPC"])

# SolFunMeme Introspector RPC endpoint
SOLFUNMEME_RPC = "https://api.solfunmeme.com/rpc"
SIO_TOKEN_ADDRESS = "Fuj6EDWQHBnQ3eEvYDujNQ4rPLSkhm3pBySbQ79Bpump"

class SolFunMemeRPC:
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=30.0)
    
    async def get_token_balance(self, wallet: str, token_mint: str) -> float:
        """Get token balance from SolFunMeme RPC"""
        try:
            response = await self.client.post(SOLFUNMEME_RPC, json={
                "jsonrpc": "2.0",
                "id": 1,
                "method": "getTokenAccountsByOwner",
                "params": [
                    wallet,
                    {"mint": token_mint},
                    {"encoding": "jsonParsed"}
                ]
            })
            data = response.json()
            
            if "result" in data and data["result"]["value"]:
                for account in data["result"]["value"]:
                    token_amount = account["account"]["data"]["parsed"]["info"]["tokenAmount"]
                    return float(token_amount["uiAmount"] or 0)
            return 0.0
        except Exception:
            return 0.0
    
    async def get_wallet_info(self, wallet: str) -> Dict:
        """Get comprehensive wallet information"""
        try:
            sio_balance = await self.get_token_balance(wallet, SIO_TOKEN_ADDRESS)
            
            # Get SOL balance
            sol_response = await self.client.post(SOLFUNMEME_RPC, json={
                "jsonrpc": "2.0",
                "id": 1,
                "method": "getBalance",
                "params": [wallet]
            })
            sol_data = sol_response.json()
            sol_balance = sol_data.get("result", {}).get("value", 0) / 1e9
            
            return {
                "wallet": wallet,
                "sio_balance": sio_balance,
                "sol_balance": sol_balance,
                "available": sio_balance,
                "locked": 0.0
            }
        except Exception:
            return {
                "wallet": wallet,
                "sio_balance": 0.0,
                "sol_balance": 0.0,
                "available": 0.0,
                "locked": 0.0
            }

rpc_client = SolFunMemeRPC()

@router.get("/balance/{wallet}")
async def get_sio_balance(wallet: str):
    """Get S-IO token balance via SolFunMeme RPC"""
    wallet_info = await rpc_client.get_wallet_info(wallet)
    return {
        "wallet": wallet,
        "balance": wallet_info["sio_balance"],
        "available": wallet_info["available"],
        "locked": wallet_info["locked"]
    }

@router.get("/wallet/{wallet}")
async def get_wallet_info(wallet: str):
    """Get complete wallet information"""
    return await rpc_client.get_wallet_info(wallet)

@router.post("/unlock-feature")
async def unlock_feature(data: dict):
    """Unlock feature with S-IO payment verification"""
    wallet = data.get("wallet")
    feature_id = data.get("feature_id")
    amount = data.get("amount")
    
    # Verify wallet has sufficient S-IO balance
    wallet_info = await rpc_client.get_wallet_info(wallet)
    if wallet_info["sio_balance"] < amount:
        raise HTTPException(400, "Insufficient S-IO balance")
    
    # In production, this would create actual Solana transaction
    # For now, return success with mock transaction
    return {
        "success": True,
        "feature_unlocked": feature_id,
        "amount_paid": amount,
        "tx_signature": f"mock_tx_{wallet[:8]}_{feature_id}",
        "remaining_balance": wallet_info["sio_balance"] - amount
    }