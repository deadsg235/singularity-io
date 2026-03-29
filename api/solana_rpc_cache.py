#!/usr/bin/env python3
"""
Solana RPC Cache System - Integrated from SolFunMeme Introspector
Bypasses rate limiting with intelligent caching
"""

import json
import os
import requests
import time
import hashlib
from typing import Dict, List, Optional, Any
from fastapi import HTTPException

# Cache configuration
CACHE_DIR = "rpc_cache"
CACHE_EXPIRY = 300  # 5 minutes for balance data
RATE_LIMIT_DELAY = 0.5  # 500ms between requests

class SolanaRPCCache:
    def __init__(self, rpc_urls: List[str]):
        self.rpc_urls = rpc_urls
        self.current_rpc_index = 0
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': 'Singularity.io/1.0'
        })
        
        # Ensure cache directory exists
        os.makedirs(CACHE_DIR, exist_ok=True)
    
    def call(self, method: str, params: List[Any], cache_ttl: int = CACHE_EXPIRY) -> Dict:
        """Make RPC call with intelligent caching"""
        cache_key = self._generate_cache_key(method, params)
        
        # Check cache first
        cached_result = self._get_cached_result(cache_key, cache_ttl)
        if cached_result:
            return cached_result
        
        # Make fresh RPC call
        return self._make_rpc_call(method, params, cache_key)
    
    def _generate_cache_key(self, method: str, params: List[Any]) -> str:
        """Generate unique cache key"""
        params_str = json.dumps(params, sort_keys=True)
        hash_obj = hashlib.md5(f"{method}_{params_str}".encode())
        return f"{method}_{hash_obj.hexdigest()}"
    
    def _get_cached_result(self, cache_key: str, ttl: int) -> Optional[Dict]:
        """Get cached result if still valid"""
        cache_file = os.path.join(CACHE_DIR, f"{cache_key}.json")
        
        if not os.path.exists(cache_file):
            return None
        
        try:
            # Check if cache is still valid
            file_age = time.time() - os.path.getmtime(cache_file)
            if file_age > ttl:
                os.remove(cache_file)  # Remove expired cache
                return None
            
            with open(cache_file, 'r') as f:
                return json.load(f)
        except Exception:
            return None
    
    def _make_rpc_call(self, method: str, params: List[Any], cache_key: str) -> Dict:
        """Make RPC call with fallback and caching"""
        last_error = None
        
        # Try each RPC endpoint
        for attempt in range(len(self.rpc_urls)):
            rpc_url = self.rpc_urls[self.current_rpc_index]
            
            try:
                payload = {
                    "jsonrpc": "2.0",
                    "id": 1,
                    "method": method,
                    "params": params
                }
                
                response = self.session.post(rpc_url, json=payload, timeout=15)
                
                if response.status_code == 200:
                    result = response.json()
                    
                    if "error" not in result:
                        # Cache successful result
                        self._save_to_cache(cache_key, result)
                        return result
                    else:
                        last_error = result["error"]
                
                # Rate limit or error - try next RPC
                self.current_rpc_index = (self.current_rpc_index + 1) % len(self.rpc_urls)
                time.sleep(RATE_LIMIT_DELAY)
                
            except Exception as e:
                last_error = str(e)
                self.current_rpc_index = (self.current_rpc_index + 1) % len(self.rpc_urls)
                time.sleep(RATE_LIMIT_DELAY)
        
        # All RPCs failed
        raise HTTPException(503, f"All RPC endpoints failed. Last error: {last_error}")
    
    def _save_to_cache(self, cache_key: str, data: Dict):
        """Save result to cache"""
        cache_file = os.path.join(CACHE_DIR, f"{cache_key}.json")
        try:
            with open(cache_file, 'w') as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            print(f"Failed to save cache: {e}")

# Global RPC cache instance
RPC_ENDPOINTS = [
    "https://api.mainnet-beta.solana.com",
    "https://solana-mainnet.g.alchemy.com/v2/demo",
    "https://mainnet.helius-rpc.com/?api-key=demo"
]

# Ensure cache directory exists
os.makedirs(CACHE_DIR, exist_ok=True)

rpc_cache = SolanaRPCCache(RPC_ENDPOINTS)

def get_token_accounts_by_owner(wallet_address: str, mint_address: str) -> Dict:
    """Get token accounts with caching"""
    params = [
        wallet_address,
        {"mint": mint_address},
        {"encoding": "jsonParsed"}
    ]
    return rpc_cache.call("getTokenAccountsByOwner", params, cache_ttl=60)  # 1 minute cache

def get_token_supply(mint_address: str) -> Dict:
    """Get token supply with caching"""
    params = [mint_address]
    return rpc_cache.call("getTokenSupply", params, cache_ttl=300)  # 5 minute cache

def get_account_info(address: str) -> Dict:
    """Get account info with caching"""
    params = [address, {"encoding": "jsonParsed"}]
    return rpc_cache.call("getAccountInfo", params, cache_ttl=60)  # 1 minute cache