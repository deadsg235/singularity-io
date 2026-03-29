"""
SIO Wallet Updates - Real-time balance monitoring using cached RPC
"""

import asyncio
import json
from typing import Dict, Callable, Optional
from sio_balance import SIOBalanceClient

class SIOWalletUpdater:
    """Real-time SIO wallet balance updates"""
    
    def __init__(self, update_interval: int = 30):
        self.client = SIOBalanceClient()
        self.update_interval = update_interval
        self.monitored_wallets: Dict[str, Dict] = {}
        self.callbacks: Dict[str, Callable] = {}
        self.running = False
    
    def add_wallet(self, wallet_address: str, callback: Callable = None):
        """Add wallet to monitor"""
        self.monitored_wallets[wallet_address] = {"last_balance": 0.0}
        if callback:
            self.callbacks[wallet_address] = callback
    
    def remove_wallet(self, wallet_address: str):
        """Remove wallet from monitoring"""
        self.monitored_wallets.pop(wallet_address, None)
        self.callbacks.pop(wallet_address, None)
    
    async def start_monitoring(self):
        """Start monitoring all wallets"""
        self.running = True
        
        while self.running:
            for wallet_address in list(self.monitored_wallets.keys()):
                try:
                    # Get current balance
                    result = await self.client.get_sio_balance(wallet_address)
                    current_balance = result.get("balance", 0.0)
                    
                    # Check for changes
                    last_balance = self.monitored_wallets[wallet_address]["last_balance"]
                    
                    if abs(current_balance - last_balance) > 0.000001:  # Balance changed
                        change = current_balance - last_balance
                        
                        update_data = {
                            "wallet": wallet_address,
                            "old_balance": last_balance,
                            "new_balance": current_balance,
                            "change": change,
                            "timestamp": asyncio.get_event_loop().time()
                        }
                        
                        # Update stored balance
                        self.monitored_wallets[wallet_address]["last_balance"] = current_balance
                        
                        # Call callback if exists
                        if wallet_address in self.callbacks:
                            await self.callbacks[wallet_address](update_data)
                        
                        print(f"SIO Balance Update: {wallet_address[:8]}... {change:+.6f} SIO (Total: {current_balance:.6f})")
                
                except Exception as e:
                    print(f"Error monitoring {wallet_address}: {e}")
            
            await asyncio.sleep(self.update_interval)
    
    def stop_monitoring(self):
        """Stop monitoring"""
        self.running = False

# Global wallet updater instance
wallet_updater = SIOWalletUpdater()

async def monitor_wallet_balance(wallet_address: str, callback: Callable = None):
    """Monitor single wallet balance"""
    wallet_updater.add_wallet(wallet_address, callback)
    
    if not wallet_updater.running:
        asyncio.create_task(wallet_updater.start_monitoring())

def get_wallet_balance_sync(wallet_address: str) -> Dict:
    """Get current wallet balance synchronously"""
    return asyncio.run(SIOBalanceClient().get_sio_balance(wallet_address))