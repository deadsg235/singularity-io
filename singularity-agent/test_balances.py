#!/usr/bin/env python3
"""
Test Singularity Agent Balance Collection
Using cached RPC system from test_sio.py reference
"""

import asyncio
from singularity_agent import SolanaClient

async def test_balance_collection():
    """Test balance collection with cached RPC"""
    print("Testing Singularity Agent Balance Collection...")
    
    # Test wallet (replace with actual wallet)
    test_wallet = "HxpisaTe3e2fgZcfvpTAwRo2QGDxzHpSZDr6j15Jt5Qp"
    
    try:
        # Initialize Solana client with cached RPC
        client = SolanaClient()
        
        print(f"Testing balance for wallet: {test_wallet}")
        
        # Test SOL balance
        sol_balance = await client.get_balance(test_wallet)
        print(f"SOL Balance: {sol_balance:.6f} SOL")
        
        # Test token balances (including SIO)
        token_balances = await client.get_token_balances(test_wallet)
        print(f"Token Balances: {token_balances}")
        
        # Test SIO balance specifically
        sio_balance = token_balances.get("SIO", 0.0)
        print(f"SIO Balance: {sio_balance:.6f} SIO")
        
        # Test wallet info
        wallet_info = await client.get_wallet_info(test_wallet)
        print(f"Wallet Info: {wallet_info}")
        
        print("✅ Balance collection working properly!")
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_balance_collection())