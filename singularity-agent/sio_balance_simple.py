"""SIO Balance Client - Simple cached RPC"""

import json
import os
import hashlib
import time
import requests
from typing import Dict, Optional

SIO_TOKEN_MINT = "Fuj6EDWQHBnQ3eEvYDujNQ4rPLSkhm3pBySbQ79Bpump"

class SIOBalanceClient:
    def __init__(self, cache_dir: str = "rpc_cache"):
        self.rpc_url = "https://api.mainnet-beta.solana.com"
        self.cache_dir = cache_dir
        os.makedirs(cache_dir, exist_ok=True)
    
    async def get_sio_balance(self, wallet_address: str) -> Dict:
        cache_key = f"sio_balance_{hashlib.md5(wallet_address.encode()).hexdigest()}"
        
        # Check cache
        cached = self._get_cache(cache_key, 60)
        if cached:
            return cached
        
        # Make RPC call
        params = [
            wallet_address,
            {"mint": SIO_TOKEN_MINT},
            {"encoding": "jsonParsed"}
        ]
        
        result = self._rpc_call("getTokenAccountsByOwner", params)
        balance_data = self._parse_sio_balance(result, wallet_address)
        
        self._save_cache(cache_key, balance_data)
        return balance_data
    
    def _parse_sio_balance(self, result: Dict, wallet_address: str) -> Dict:
        if "error" in result:
            return {"balance": 0, "wallet": wallet_address, "mint": SIO_TOKEN_MINT}
        
        token_accounts = result.get("result", {}).get("value", [])
        if not token_accounts:
            return {"balance": 0, "wallet": wallet_address, "mint": SIO_TOKEN_MINT}
        
        account_info = token_accounts[0]["account"]["data"]["parsed"]["info"]
        balance = float(account_info["tokenAmount"]["uiAmount"] or 0)
        
        return {"balance": balance, "wallet": wallet_address, "mint": SIO_TOKEN_MINT}
    
    def _rpc_call(self, method: str, params: list) -> Dict:
        payload = {"jsonrpc": "2.0", "id": 1, "method": method, "params": params}
        
        try:
            response = requests.post(self.rpc_url, json=payload, timeout=15)
            return response.json()
        except:
            return {"error": "RPC call failed"}
    
    def _get_cache(self, key: str, ttl: int) -> Optional[Dict]:
        cache_file = os.path.join(self.cache_dir, f"{key}.json")
        
        if not os.path.exists(cache_file):
            return None
        
        if time.time() - os.path.getmtime(cache_file) > ttl:
            os.remove(cache_file)
            return None
        
        try:
            with open(cache_file, 'r') as f:
                return json.load(f)
        except:
            return None
    
    def _save_cache(self, key: str, data: Dict):
        cache_file = os.path.join(self.cache_dir, f"{key}.json")
        try:
            with open(cache_file, 'w') as f:
                json.dump(data, f)
        except:
            pass