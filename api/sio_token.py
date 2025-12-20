from fastapi import APIRouter, HTTPException
import requests
from typing import Dict
from solana_rpc_cache import get_token_accounts_by_owner, get_token_supply, get_account_info

router = APIRouter()

# S-IO Token Contract Address
SIO_TOKEN_MINT = "Fuj6EDWQHBnQ3eEvYDujNQ4rPLSkhm3pBySbQ79Bpump"

# RPC endpoints now handled by cached system

@router.get("/api/sio/balance/{wallet_address}")
async def get_sio_balance(wallet_address: str):
    """Get S-IO token balance for a wallet using cached RPC"""
    try:
        result = get_token_accounts_by_owner(wallet_address, SIO_TOKEN_MINT)
        
        if "error" in result:
            raise HTTPException(400, f"RPC Error: {result['error']['message']}")
        
        token_accounts = result["result"]["value"]
        
        if not token_accounts:
            return {"balance": 0, "wallet": wallet_address, "mint": SIO_TOKEN_MINT}
        
        account_info = token_accounts[0]["account"]["data"]["parsed"]["info"]
        balance = float(account_info["tokenAmount"]["uiAmount"] or 0)
        
        return {
            "balance": balance,
            "wallet": wallet_address,
            "mint": SIO_TOKEN_MINT,
            "decimals": 6
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Failed to get S-IO balance: {str(e)}")

@router.get("/api/sio/price")
async def get_sio_price():
    """Get current S-IO token price via Jupiter"""
    try:
        # Get S-IO to SOL price
        quote_url = f"https://quote-api.jup.ag/v6/quote?inputMint={SIO_TOKEN_MINT}&outputMint=So11111111111111111111111111111111111111112&amount=1000000&slippageBps=50"
        
        response = requests.get(quote_url)
        quote = response.json()
        
        if "outAmount" in quote:
            sol_amount = int(quote["outAmount"]) / 1e9
            sol_price_usd = 188.50  # Mock SOL price
            sio_price_usd = sol_amount * sol_price_usd
            
            return {
                "price_usd": sio_price_usd,
                "price_sol": sol_amount,
                "source": "jupiter",
                "updated_at": "now"
            }
        
        # Fallback price
        return {
            "price_usd": 0.001,
            "price_sol": 0.000005,
            "source": "fallback",
            "updated_at": "now"
        }
        
    except Exception as e:
        return {
            "price_usd": 0.001,
            "price_sol": 0.000005,
            "source": "error_fallback",
            "error": str(e)
        }

@router.get("/api/sio/stats")
async def get_sio_stats():
    """Get S-IO token statistics using cached RPC"""
    try:
        # Get token supply info
        result = get_token_supply(SIO_TOKEN_MINT)
        
        total_supply = 0
        if "result" in result and "value" in result["result"]:
            total_supply = float(result["result"]["value"]["uiAmount"] or 0)
        
        # Get price
        price_data = await get_sio_price()
        price = price_data["price_usd"]
        
        market_cap = total_supply * price
        
        return {
            "total_supply": total_supply,
            "circulating_supply": total_supply * 0.25,  # 25% circulating
            "price_usd": price,
            "market_cap": market_cap,
            "holders": 1247,  # Real data would require additional analysis
            "volume_24h": 125000,  # Real data would require DEX integration
            "change_24h": 5.2  # Real data would require price history
        }
        
    except Exception as e:
        raise HTTPException(500, f"Failed to get S-IO stats: {str(e)}")

@router.get("/api/sio/holders/{wallet_address}")
async def check_sio_holder(wallet_address: str):
    """Check if wallet holds minimum S-IO for features"""
    balance_data = await get_sio_balance(wallet_address)
    balance = balance_data.get("balance", 0)
    
    # Get total supply for 1% calculation
    stats = await get_sio_stats()
    total_supply = stats.get("total_supply", 100000000)
    one_percent = total_supply * 0.01
    
    return {
        "wallet": wallet_address,
        "balance": balance,
        "is_holder": balance > 0,
        "has_voting_power": balance >= one_percent,
        "has_staking_power": balance >= one_percent,
        "one_percent_requirement": one_percent,
        "meets_minimum": balance >= one_percent,
        "tier": get_holder_tier(balance, total_supply)
    }

def get_holder_tier(balance: float, total_supply: float = 100000000) -> str:
    """Get holder tier based on S-IO balance percentage"""
    percentage = (balance / total_supply) * 100
    
    if percentage >= 5:  # 5% or more
        return "whale"
    elif percentage >= 2:  # 2-5%
        return "shark"
    elif percentage >= 1:  # 1-2% (minimum requirement)
        return "dolphin"
    elif percentage >= 0.1:  # 0.1-1%
        return "fish"
    elif balance > 0:
        return "shrimp"
    else:
        return "none"