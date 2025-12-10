from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import requests
import json
from typing import Dict, List

router = APIRouter()

class WalletRequest(BaseModel):
    wallet_address: str

class TokenBalance(BaseModel):
    mint: str
    amount: float
    decimals: int
    symbol: str = "Unknown"

# Solana RPC endpoint
SOLANA_RPC = "https://api.mainnet-beta.solana.com"

@router.get("/api/wallet/balance/{wallet_address}")
async def get_wallet_balance(wallet_address: str):
    """Get SOL balance for a wallet"""
    try:
        payload = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "getBalance",
            "params": [wallet_address]
        }
        
        response = requests.post(SOLANA_RPC, json=payload)
        result = response.json()
        
        if "error" in result:
            raise HTTPException(400, f"RPC Error: {result['error']['message']}")
        
        balance_lamports = result["result"]["value"]
        balance_sol = balance_lamports / 1e9
        
        return {
            "wallet": wallet_address,
            "sol_balance": balance_sol,
            "lamports": balance_lamports
        }
    except Exception as e:
        raise HTTPException(500, f"Failed to get balance: {str(e)}")

@router.get("/api/wallet/tokens/{wallet_address}")
async def get_token_balances(wallet_address: str):
    """Get all token balances for a wallet"""
    try:
        # Get token accounts
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
        
        response = requests.post(SOLANA_RPC, json=payload)
        result = response.json()
        
        if "error" in result:
            raise HTTPException(400, f"RPC Error: {result['error']['message']}")
        
        token_accounts = result["result"]["value"]
        balances = []
        
        for account in token_accounts:
            account_data = account["account"]["data"]["parsed"]["info"]
            token_amount = account_data["tokenAmount"]
            
            if float(token_amount["amount"]) > 0:
                balances.append({
                    "mint": account_data["mint"],
                    "amount": float(token_amount["uiAmount"]) if token_amount["uiAmount"] else 0,
                    "decimals": token_amount["decimals"],
                    "symbol": "Unknown"  # Would need token metadata lookup
                })
        
        return {
            "wallet": wallet_address,
            "tokens": balances,
            "count": len(balances)
        }
    except Exception as e:
        raise HTTPException(500, f"Failed to get token balances: {str(e)}")

@router.get("/api/wallet/transactions/{wallet_address}")
async def get_recent_transactions(wallet_address: str, limit: int = 10):
    """Get recent transactions for a wallet"""
    try:
        payload = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "getSignaturesForAddress",
            "params": [wallet_address, {"limit": limit}]
        }
        
        response = requests.post(SOLANA_RPC, json=payload)
        result = response.json()
        
        if "error" in result:
            raise HTTPException(400, f"RPC Error: {result['error']['message']}")
        
        signatures = result["result"]
        transactions = []
        
        for sig_info in signatures:
            transactions.append({
                "signature": sig_info["signature"],
                "slot": sig_info["slot"],
                "block_time": sig_info.get("blockTime"),
                "status": "success" if sig_info.get("err") is None else "failed",
                "fee": sig_info.get("fee", 0)
            })
        
        return {
            "wallet": wallet_address,
            "transactions": transactions
        }
    except Exception as e:
        raise HTTPException(500, f"Failed to get transactions: {str(e)}")

@router.post("/api/wallet/validate")
async def validate_wallet_address(request: WalletRequest):
    """Validate if a wallet address is valid"""
    try:
        # Basic validation - Solana addresses are 32-44 characters base58
        if len(request.wallet_address) < 32 or len(request.wallet_address) > 44:
            return {"valid": False, "reason": "Invalid length"}
        
        # Try to get account info to validate
        payload = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "getAccountInfo",
            "params": [request.wallet_address]
        }
        
        response = requests.post(SOLANA_RPC, json=payload)
        result = response.json()
        
        if "error" in result:
            return {"valid": False, "reason": result["error"]["message"]}
        
        return {"valid": True, "exists": result["result"]["value"] is not None}
    except Exception as e:
        return {"valid": False, "reason": str(e)}