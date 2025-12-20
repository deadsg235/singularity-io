"""
Wallet Adapter - Solana wallet connection integration
"""

import json
from typing import Dict, Optional, List
from dataclasses import dataclass

@dataclass
class WalletInfo:
    """Wallet connection info"""
    address: str
    connected: bool
    adapter_name: str
    balance: float = 0.0

class WalletAdapter:
    """Minimal wallet adapter for Solana wallets"""
    
    def __init__(self):
        self.connected_wallet: Optional[WalletInfo] = None
        self.supported_wallets = [
            "phantom", "solflare", "backpack", "coinbase", "torus"
        ]
    
    async def connect_wallet(self, adapter_name: str, address: str) -> WalletInfo:
        """Connect wallet"""
        if adapter_name not in self.supported_wallets:
            raise ValueError(f"Unsupported wallet: {adapter_name}")
        
        # Get balance
        from sio_balance import SIOBalanceClient
        client = SIOBalanceClient()
        balance_result = await client.get_sio_balance(address)
        
        wallet_info = WalletInfo(
            address=address,
            connected=True,
            adapter_name=adapter_name,
            balance=balance_result.get("balance", 0.0)
        )
        
        self.connected_wallet = wallet_info
        return wallet_info
    
    def disconnect_wallet(self):
        """Disconnect wallet"""
        self.connected_wallet = None
    
    def get_connected_wallet(self) -> Optional[WalletInfo]:
        """Get connected wallet info"""
        return self.connected_wallet
    
    async def sign_message(self, message: str) -> str:
        """Sign message (mock implementation)"""
        if not self.connected_wallet:
            raise ValueError("No wallet connected")
        
        # Mock signature
        return f"signed_{message}_{self.connected_wallet.address[:8]}"
    
    async def send_transaction(self, transaction_data: Dict) -> str:
        """Send transaction (mock implementation)"""
        if not self.connected_wallet:
            raise ValueError("No wallet connected")
        
        # Mock transaction signature
        return f"tx_sig_{self.connected_wallet.address[:8]}_{hash(str(transaction_data))}"