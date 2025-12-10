from fastapi import APIRouter, HTTPException
from solana_rpc_cache import get_token_accounts_by_owner, get_account_info, rpc_cache
from sio_token import SIO_TOKEN_MINT
import json

router = APIRouter()

@router.get("/api/wallet/analytics/{wallet_address}")
async def get_wallet_analytics(wallet_address: str):
    """Get comprehensive wallet analytics including SOL and S-IO balances"""
    try:
        # Get SOL balance
        sol_result = rpc_cache.call("getBalance", [wallet_address])
        sol_balance = 0
        if "result" in sol_result:
            sol_balance = sol_result["result"]["value"] / 1e9
        
        # Get S-IO balance
        sio_result = get_token_accounts_by_owner(wallet_address, SIO_TOKEN_MINT)
        sio_balance = 0
        if "result" in sio_result and sio_result["result"]["value"]:
            account_info = sio_result["result"]["value"][0]["account"]["data"]["parsed"]["info"]
            sio_balance = float(account_info["tokenAmount"]["uiAmount"] or 0)
        
        # Get all token accounts
        all_tokens_result = rpc_cache.call("getTokenAccountsByOwner", [
            wallet_address,
            {"programId": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"},
            {"encoding": "jsonParsed"}
        ])
        
        tokens = []
        if "result" in all_tokens_result:
            for account in all_tokens_result["result"]["value"]:
                token_info = account["account"]["data"]["parsed"]["info"]
                amount = float(token_info["tokenAmount"]["uiAmount"] or 0)
                if amount > 0:
                    tokens.append({
                        "mint": token_info["mint"],
                        "amount": amount,
                        "decimals": token_info["tokenAmount"]["decimals"]
                    })
        
        return {
            "wallet": wallet_address,
            "sol_balance": sol_balance,
            "sio_balance": sio_balance,
            "total_tokens": len(tokens),
            "tokens": tokens,
            "timestamp": "now"
        }
        
    except Exception as e:
        raise HTTPException(500, f"Failed to get wallet analytics: {str(e)}")

@router.get("/api/wallet/portfolio/{wallet_address}")
async def get_wallet_portfolio(wallet_address: str):
    """Get portfolio data with real values"""
    analytics = await get_wallet_analytics(wallet_address)
    
    # Calculate portfolio value (simplified pricing)
    sol_price = 188.50  # Would use real price API
    sio_price = 0.001   # Would use real price API
    
    sol_value = analytics["sol_balance"] * sol_price
    sio_value = analytics["sio_balance"] * sio_price
    total_value = sol_value + sio_value
    
    holdings = [
        {
            "symbol": "SOL",
            "amount": analytics["sol_balance"],
            "value": sol_value,
            "percentage": (sol_value / total_value * 100) if total_value > 0 else 0
        },
        {
            "symbol": "S-IO",
            "amount": analytics["sio_balance"],
            "value": sio_value,
            "percentage": (sio_value / total_value * 100) if total_value > 0 else 0
        }
    ]
    
    return {
        "wallet": wallet_address,
        "total_value": total_value,
        "holdings": holdings,
        "sol_balance": analytics["sol_balance"],
        "sio_balance": analytics["sio_balance"]
    }