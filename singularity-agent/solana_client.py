"""
Solana Blockchain Integration for Singularity Agents
Based on Dexter's Solana client architecture
"""

import asyncio
import json
import logging
import os
import hashlib
import time
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass
from decimal import Decimal
import aiohttp
import base58

@dataclass
class SolanaWallet:
    """Solana wallet representation"""
    public_key: str
    label: Optional[str] = None
    balance: float = 0.0
    token_balances: Dict[str, float] = None
    
    def __post_init__(self):
        if self.token_balances is None:
            self.token_balances = {}

@dataclass
class TokenInfo:
    """Token information"""
    mint: str
    symbol: str
    name: str
    decimals: int
    price_usd: Optional[float] = None

@dataclass
class TradeOrder:
    """Trade order representation"""
    order_id: str
    wallet: str
    token_in: str
    token_out: str
    amount_in: float
    amount_out: float
    slippage: float
    status: str
    signature: Optional[str] = None

class SolanaRPCCache:
    """Cached RPC client based on SolFunMeme introspector"""
    
    def __init__(self, rpc_urls: List[str], cache_dir: str = "rpc_cache"):
        self.rpc_urls = rpc_urls
        self.current_rpc_index = 0
        self.cache_dir = cache_dir
        self.cache_expiry = 300  # 5 minutes
        
        # Ensure cache directory exists
        os.makedirs(cache_dir, exist_ok=True)
    
    async def call(self, method: str, params: List[Any], cache_ttl: int = None) -> Dict:
        """Make cached RPC call"""
        if cache_ttl is None:
            cache_ttl = self.cache_expiry
            
        cache_key = self._generate_cache_key(method, params)
        
        # Check cache first
        cached_result = self._get_cached_result(cache_key, cache_ttl)
        if cached_result:
            return cached_result
        
        # Make fresh RPC call
        return await self._make_rpc_call(method, params, cache_key)
    
    def _generate_cache_key(self, method: str, params: List[Any]) -> str:
        """Generate unique cache key"""
        params_str = json.dumps(params, sort_keys=True)
        hash_obj = hashlib.md5(f"{method}_{params_str}".encode())
        return f"{method}_{hash_obj.hexdigest()}"
    
    def _get_cached_result(self, cache_key: str, ttl: int) -> Optional[Dict]:
        """Get cached result if still valid"""
        cache_file = os.path.join(self.cache_dir, f"{cache_key}.json")
        
        if not os.path.exists(cache_file):
            return None
        
        try:
            file_age = time.time() - os.path.getmtime(cache_file)
            if file_age > ttl:
                os.remove(cache_file)
                return None
            
            with open(cache_file, 'r') as f:
                return json.load(f)
        except Exception:
            return None
    
    async def _make_rpc_call(self, method: str, params: List[Any], cache_key: str) -> Dict:
        """Make RPC call with fallback"""
        last_error = None
        
        for attempt in range(len(self.rpc_urls)):
            rpc_url = self.rpc_urls[self.current_rpc_index]
            
            try:
                payload = {
                    "jsonrpc": "2.0",
                    "id": 1,
                    "method": method,
                    "params": params
                }
                
                async with aiohttp.ClientSession() as session:
                    async with session.post(rpc_url, json=payload, timeout=15) as response:
                        if response.status == 200:
                            result = await response.json()
                            
                            if "error" not in result:
                                self._save_to_cache(cache_key, result)
                                return result
                            else:
                                last_error = result["error"]
                
                self.current_rpc_index = (self.current_rpc_index + 1) % len(self.rpc_urls)
                await asyncio.sleep(0.5)  # Rate limit delay
                
            except Exception as e:
                last_error = str(e)
                self.current_rpc_index = (self.current_rpc_index + 1) % len(self.rpc_urls)
                await asyncio.sleep(0.5)
        
        raise Exception(f"All RPC endpoints failed. Last error: {last_error}")
    
    def _save_to_cache(self, cache_key: str, data: Dict):
        """Save result to cache"""
        cache_file = os.path.join(self.cache_dir, f"{cache_key}.json")
        try:
            with open(cache_file, 'w') as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            print(f"Failed to save cache: {e}")
class SolanaClient:
    """Solana blockchain client with cached RPC"""
    
    def __init__(self, rpc_urls: List[str] = None):
        if rpc_urls is None:
            rpc_urls = [
                "https://api.mainnet-beta.solana.com",
                "https://solana-mainnet.g.alchemy.com/v2/demo",
                "https://mainnet.helius-rpc.com/?api-key=demo"
            ]
        
        self.rpc_cache = SolanaRPCCache(rpc_urls)
        self.logger = logging.getLogger("solana_client")
        
        # Token registry with SIO token
        self.token_registry = {
            "SOL": TokenInfo("So11111111111111111111111111111111111111112", "SOL", "Solana", 9),
            "USDC": TokenInfo("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", "USDC", "USD Coin", 6),
            "USDT": TokenInfo("Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", "USDT", "Tether", 6),
            "SIO": TokenInfo("Fuj6EDWQHBnQ3eEvYDujNQ4rPLSkhm3pBySbQ79Bpump", "SIO", "Singularity.io", 6),
        }
    
    async def get_balance(self, wallet_address: str) -> float:
        """Get SOL balance using cached RPC"""
        try:
            result = await self.rpc_cache.call("getBalance", [wallet_address])
            lamports = result.get("result", {}).get("value", 0)
            return lamports / 1_000_000_000
        except Exception as e:
            self.logger.error(f"Failed to get balance: {e}")
            return 0.0
    
    async def get_token_balances(self, wallet_address: str) -> Dict[str, float]:
        """Get token balances using cached RPC like test_sio.py"""
        try:
            balances = {}
            
            # Get SIO balance specifically
            sio_mint = self.token_registry["SIO"].mint
            sio_result = await self.rpc_cache.call(
                "getTokenAccountsByOwner",
                [wallet_address, {"mint": sio_mint}, {"encoding": "jsonParsed"}],
                cache_ttl=60
            )
            
            if "result" in sio_result and "value" in sio_result["result"]:
                token_accounts = sio_result["result"]["value"]
                if token_accounts:
                    account_info = token_accounts[0]["account"]["data"]["parsed"]["info"]
                    sio_balance = float(account_info["tokenAmount"]["uiAmount"] or 0)
                    if sio_balance > 0:
                        balances["SIO"] = sio_balance
            
            return balances
            
        except Exception as e:
            self.logger.error(f"Failed to get token balances: {e}")
            return {}
    
    def _get_token_symbol(self, mint: str) -> Optional[str]:
        """Get token symbol from mint address"""
        for symbol, token_info in self.token_registry.items():
            if token_info.mint == mint:
                return symbol
        return None
    
    async def get_wallet_info(self, wallet_address: str) -> SolanaWallet:
        """Get comprehensive wallet information"""
        sol_balance = await self.get_balance(wallet_address)
        token_balances = await self.get_token_balances(wallet_address)
        
        return SolanaWallet(
            public_key=wallet_address,
            balance=sol_balance,
            token_balances=token_balances
        )
    
    async def simulate_swap(
        self,
        wallet_address: str,
        token_in: str,
        token_out: str,
        amount: float,
        slippage: float = 0.01
    ) -> Dict[str, Any]:
        """Simulate a token swap (Jupiter API integration would go here)"""
        # This is a mock implementation
        # In reality, you'd integrate with Jupiter API or similar DEX aggregator
        
        try:
            # Mock price calculation
            if token_in == "SOL" and token_out == "USDC":
                price = 100.0  # Mock SOL price
                amount_out = amount * price * (1 - slippage)
            elif token_in == "USDC" and token_out == "SOL":
                price = 100.0
                amount_out = amount / price * (1 - slippage)
            else:
                amount_out = amount * 0.99  # Mock conversion
            
            return {
                "success": True,
                "amount_in": amount,
                "amount_out": amount_out,
                "price_impact": slippage,
                "fee": amount * 0.003,  # 0.3% fee
                "route": [token_in, token_out]
            }
            
        except Exception as e:
            self.logger.error(f"Swap simulation failed: {e}")
            return {"success": False, "error": str(e)}
    
    async def execute_swap(
        self,
        wallet_address: str,
        token_in: str,
        token_out: str,
        amount: float,
        slippage: float = 0.01,
        private_key: Optional[str] = None
    ) -> TradeOrder:
        """Execute a token swap"""
        # This is a mock implementation
        # In reality, you'd need to:
        # 1. Build the swap transaction
        # 2. Sign with private key
        # 3. Send to network
        # 4. Monitor for confirmation
        
        order_id = f"swap_{int(asyncio.get_event_loop().time())}"
        
        # Simulate swap execution
        simulation = await self.simulate_swap(wallet_address, token_in, token_out, amount, slippage)
        
        if simulation["success"]:
            # Mock successful execution
            order = TradeOrder(
                order_id=order_id,
                wallet=wallet_address,
                token_in=token_in,
                token_out=token_out,
                amount_in=amount,
                amount_out=simulation["amount_out"],
                slippage=slippage,
                status="completed",
                signature="mock_signature_" + order_id
            )
            
            self.logger.info(f"Swap executed: {amount} {token_in} -> {simulation['amount_out']:.6f} {token_out}")
            
        else:
            order = TradeOrder(
                order_id=order_id,
                wallet=wallet_address,
                token_in=token_in,
                token_out=token_out,
                amount_in=amount,
                amount_out=0.0,
                slippage=slippage,
                status="failed"
            )
        
        return order
    
    async def get_token_price(self, token_symbol: str) -> Optional[float]:
        """Get current token price in USD"""
        # Mock price data - in reality, integrate with price APIs
        mock_prices = {
            "SOL": 100.0,
            "USDC": 1.0,
            "USDT": 1.0,
            "BTC": 45000.0,
            "ETH": 3000.0
        }
        
        return mock_prices.get(token_symbol)
    
    async def monitor_wallet(self, wallet_address: str, callback=None) -> None:
        """Monitor wallet for changes (simplified implementation)"""
        self.logger.info(f"Starting wallet monitoring for {wallet_address}")
        
        last_balance = await self.get_balance(wallet_address)
        last_tokens = await self.get_token_balances(wallet_address)
        
        while True:
            try:
                await asyncio.sleep(30)  # Check every 30 seconds
                
                current_balance = await self.get_balance(wallet_address)
                current_tokens = await self.get_token_balances(wallet_address)
                
                # Check for changes
                if abs(current_balance - last_balance) > 0.001:  # SOL balance changed
                    change = current_balance - last_balance
                    self.logger.info(f"SOL balance changed: {change:+.6f} SOL")
                    
                    if callback:
                        await callback("balance_change", {
                            "token": "SOL",
                            "change": change,
                            "new_balance": current_balance
                        })
                
                # Check token balance changes
                for token, balance in current_tokens.items():
                    last_balance_token = last_tokens.get(token, 0.0)
                    if abs(balance - last_balance_token) > 0.001:
                        change = balance - last_balance_token
                        self.logger.info(f"{token} balance changed: {change:+.6f}")
                        
                        if callback:
                            await callback("token_balance_change", {
                                "token": token,
                                "change": change,
                                "new_balance": balance
                            })
                
                last_balance = current_balance
                last_tokens = current_tokens
                
            except Exception as e:
                self.logger.error(f"Wallet monitoring error: {e}")
                await asyncio.sleep(60)  # Wait longer on error

class SolanaTradeExecutor:
    """High-level trade execution interface"""
    
    def __init__(self, solana_client: SolanaClient):
        self.client = solana_client
        self.logger = logging.getLogger("trade_executor")
    
    async def execute_dca_purchase(
        self,
        wallet_address: str,
        target_token: str,
        usd_amount: float,
        max_slippage: float = 0.02
    ) -> TradeOrder:
        """Execute DCA purchase"""
        try:
            # Get current token price
            token_price = await self.client.get_token_price(target_token)
            if not token_price:
                raise Exception(f"Could not get price for {target_token}")
            
            # Calculate token amount to buy
            token_amount = usd_amount / token_price
            
            # Execute swap from USDC to target token
            order = await self.client.execute_swap(
                wallet_address=wallet_address,
                token_in="USDC",
                token_out=target_token,
                amount=usd_amount,
                slippage=max_slippage
            )
            
            self.logger.info(f"DCA purchase executed: ${usd_amount} -> {order.amount_out:.6f} {target_token}")
            
            return order
            
        except Exception as e:
            self.logger.error(f"DCA purchase failed: {e}")
            raise
    
    async def execute_arbitrage(
        self,
        wallet_address: str,
        token: str,
        buy_exchange: str,
        sell_exchange: str,
        amount: float
    ) -> List[TradeOrder]:
        """Execute arbitrage trade"""
        # Placeholder for arbitrage execution
        self.logger.info(f"Arbitrage execution not yet implemented")
        return []
    
    async def get_portfolio_value(self, wallet_address: str) -> Dict[str, Any]:
        """Get total portfolio value in USD"""
        wallet_info = await self.client.get_wallet_info(wallet_address)
        
        total_value = 0.0
        token_values = {}
        
        # SOL value
        sol_price = await self.client.get_token_price("SOL")
        if sol_price:
            sol_value = wallet_info.balance * sol_price
            total_value += sol_value
            token_values["SOL"] = {
                "balance": wallet_info.balance,
                "price": sol_price,
                "value": sol_value
            }
        
        # Token values
        for token, balance in wallet_info.token_balances.items():
            price = await self.client.get_token_price(token)
            if price:
                value = balance * price
                total_value += value
                token_values[token] = {
                    "balance": balance,
                    "price": price,
                    "value": value
                }
        
        return {
            "total_value_usd": total_value,
            "tokens": token_values,
            "wallet": wallet_address
        }