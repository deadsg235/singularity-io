#!/usr/bin/env python3
"""
Test SIO Wallet Updates
"""

import asyncio
from wallet_updates import monitor_wallet_balance

async def balance_change_callback(update_data):
    """Handle balance changes"""
    print(f"🔄 Balance Changed!")
    print(f"   Wallet: {update_data['wallet'][:8]}...")
    print(f"   Change: {update_data['change']:+.6f} SIO")
    print(f"   New Balance: {update_data['new_balance']:.6f} SIO")

async def test_wallet_monitoring():
    """Test wallet monitoring"""
    print("Testing SIO Wallet Updates...")
    
    test_wallet = "HxpisaTe3e2fgZcfvpTAwRo2QGDxzHpSZDr6j15Jt5Qp"
    
    print(f"Monitoring wallet: {test_wallet}")
    
    # Start monitoring
    await monitor_wallet_balance(test_wallet, balance_change_callback)
    
    # Keep running
    try:
        while True:
            await asyncio.sleep(1)
    except KeyboardInterrupt:
        print("\n🛑 Stopping wallet monitoring...")

if __name__ == "__main__":
    asyncio.run(test_wallet_monitoring())