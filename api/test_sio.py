#!/usr/bin/env python3
"""
Test S-IO token functionality
"""

import asyncio
from sio_token import router as sio_router

async def test_sio_system():
    """Test the S-IO token system"""
    print("Testing S-IO Token System...")
    
    # Test wallet (replace with actual wallet for testing)
    test_wallet = "HxpisaTe3e2fgZcfvpTAwRo2QGDxzHpSZDr6j15Jt5Qp"
    
    try:
        # Test balance retrieval
        print(f"Testing balance for wallet: {test_wallet}")
        # Test balance via API endpoint
        import requests
        balance_response = requests.get(f'http://localhost:8000/api/sio/balance/{test_wallet}')
        balance_result = balance_response.json()
        print(f"Balance result: {balance_result}")
        
        # Test stats retrieval
        print("Testing S-IO stats...")
        # Test stats via API endpoint
        stats_response = requests.get('http://localhost:8000/api/sio/stats')
        stats_result = stats_response.json()
        print(f"Stats result: {stats_result}")
        
        print("✅ S-IO system working properly!")
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_sio_system())