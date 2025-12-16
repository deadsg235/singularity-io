"""
Python-Rust Bridge for Solana Wallet Integration
"""

import json
import subprocess
import os
from typing import Optional, Dict, Any

class SolanaWalletBridge:
    def __init__(self):
        self.rust_binary = "./target/release/solana_bridge"
        self.connected = False
        self.public_key = None
        
    def connect_phantom(self) -> Dict[str, Any]:
        """Connect to Phantom wallet via Rust bridge"""
        try:
            result = subprocess.run([
                self.rust_binary, "connect"
            ], capture_output=True, text=True, timeout=30)
            
            if result.returncode == 0:
                data = json.loads(result.stdout)
                self.connected = True
                self.public_key = data.get('public_key')
                return {"success": True, "public_key": self.public_key}
            else:
                return {"success": False, "error": result.stderr}
                
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def get_balance(self, address: str) -> Dict[str, Any]:
        """Get SOL balance for address"""
        try:
            result = subprocess.run([
                self.rust_binary, "balance", address
            ], capture_output=True, text=True, timeout=30)
            
            if result.returncode == 0:
                data = json.loads(result.stdout)
                return {"success": True, "balance": data.get('balance', 0)}
            else:
                return {"success": False, "error": result.stderr}
                
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def get_token_balance(self, address: str, mint: str) -> Dict[str, Any]:
        """Get SPL token balance"""
        try:
            result = subprocess.run([
                self.rust_binary, "token_balance", address, mint
            ], capture_output=True, text=True, timeout=30)
            
            if result.returncode == 0:
                data = json.loads(result.stdout)
                return {"success": True, "balance": data.get('balance', 0)}
            else:
                return {"success": False, "error": result.stderr}
                
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def send_transaction(self, to_address: str, amount: float) -> Dict[str, Any]:
        """Send SOL transaction"""
        try:
            result = subprocess.run([
                self.rust_binary, "send", to_address, str(amount)
            ], capture_output=True, text=True, timeout=60)
            
            if result.returncode == 0:
                data = json.loads(result.stdout)
                return {"success": True, "signature": data.get('signature')}
            else:
                return {"success": False, "error": result.stderr}
                
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def create_token(self, name: str, symbol: str, decimals: int) -> Dict[str, Any]:
        """Create new SPL token"""
        try:
            result = subprocess.run([
                self.rust_binary, "create_token", name, symbol, str(decimals)
            ], capture_output=True, text=True, timeout=60)
            
            if result.returncode == 0:
                data = json.loads(result.stdout)
                return {"success": True, "mint": data.get('mint')}
            else:
                return {"success": False, "error": result.stderr}
                
        except Exception as e:
            return {"success": False, "error": str(e)}

# Global bridge instance
wallet_bridge = SolanaWalletBridge()