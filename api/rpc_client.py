import json
import time
import hashlib
from urllib.request import urlopen, Request
from urllib.parse import urlencode

class CachedRPCClient:
    def __init__(self):
        self.cache = {}
        self.cache_ttl = 30  # 30 seconds
        self.rpc_endpoints = [
            "https://api.mainnet-beta.solana.com",
            "https://solana-api.projectserum.com",
            "https://rpc.ankr.com/solana"
        ]
    
    def _cache_key(self, method, params):
        data = json.dumps({"method": method, "params": params}, sort_keys=True)
        return hashlib.md5(data.encode()).hexdigest()
    
    def _is_cache_valid(self, timestamp):
        return time.time() - timestamp < self.cache_ttl
    
    def call(self, method, params):
        cache_key = self._cache_key(method, params)
        
        # Check cache
        if cache_key in self.cache:
            cached_data, timestamp = self.cache[cache_key]
            if self._is_cache_valid(timestamp):
                return cached_data
        
        # Make RPC call
        rpc_data = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": method,
            "params": params
        }
        
        for endpoint in self.rpc_endpoints:
            try:
                req = Request(endpoint, 
                            data=json.dumps(rpc_data).encode(),
                            headers={'Content-Type': 'application/json'})
                
                with urlopen(req, timeout=10) as response:
                    result = json.loads(response.read().decode())
                    
                    if "error" not in result:
                        # Cache successful result
                        self.cache[cache_key] = (result, time.time())
                        return result
                    
            except Exception as e:
                continue
        
        return {"error": {"code": -1, "message": "All RPC endpoints failed"}}

rpc_client = CachedRPCClient()

def get_sol_balance(wallet):
    result = rpc_client.call("getBalance", [wallet])
    if "error" in result:
        return {"error": result["error"]}
    return {"balance": result["result"]["value"] / 1e9}

def get_sio_balance(wallet):
    result = rpc_client.call("getTokenAccountsByOwner", [
        wallet,
        {"mint": "Fuj6EDWQHBnQ3eEvYDujNQ4rPLSkhm3pBySbQ79Bpump"},
        {"encoding": "jsonParsed"}
    ])
    
    if "error" in result:
        return {"error": result["error"]}
    
    if not result["result"]["value"]:
        return {"balance": 0}
    
    account_info = result["result"]["value"][0]["account"]["data"]["parsed"]["info"]
    balance = float(account_info["tokenAmount"]["uiAmount"] or 0)
    return {"balance": balance}