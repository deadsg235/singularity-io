#!/usr/bin/env python3
"""
Test S-IO token functionality
"""

import asyncio
from sio_token import get_sio_balance, get_sio_stats

async def test_sio_system():
    """Test the S-IO token system"""
    print("Testing S-IO Token System...")
    
    # Test wallet (replace with actual wallet for testing)
    test_wallet = "HxpisaTe3e2fgZcfvpTAwRo2QGDxzHpSZDr6j15Jt5Qp"
    
    try:
        # Test balance retrieval
        print(f"Testing balance for wallet: {test_wallet}")
        balance_result = await get_sio_balance(test_wallet)
        print(f"Balance result: {balance_result}")
        
        # Test stats retrieval
        print("Testing S-IO stats...")
        stats_result = await get_sio_stats()
        print(f"Stats result: {stats_result}")
        
        print("✅ S-IO system working properly!")
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_sio_system())