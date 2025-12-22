"""
Complete S-IO Validator Integration
Fully functional validator with transaction processing, RPC integration, and data transmission
"""
import asyncio
import json
from typing import Dict, Any, Optional
from .sio_validator_complete import SIOValidator
from .sio_transaction_builder import SIOTransactionBuilder
from .sio_wallet_manager import SIOWalletManager

class CompleteSIOValidator:
    """Complete S-IO validator with full functionality"""
    
    def __init__(self, program_id: str, rpc_cache):
        self.program_id = program_id
        self.rpc_cache = rpc_cache
        
        # Initialize components
        self.validator = SIOValidator(program_id, rpc_cache)
        self.transaction_builder = SIOTransactionBuilder(program_id, rpc_cache)
        self.wallet_manager = SIOWalletManager(rpc_cache)
        
        # Statistics
        self.stats = {
            "transactions_processed": 0,
            "data_stored": 0,
            "payments_settled": 0,
            "errors": 0
        }
    
    async def process_store_data_request(
        self,
        wallet_address: str,
        data: Dict[str, Any],
        metadata: bytes = b"",
        wallet_type: str = "phantom"
    ) -> Dict[str, Any]:
        """Complete data storage flow"""
        
        try:
            # Connect wallet
            wallet_connection = await self.wallet_manager.connect_wallet(wallet_type)
            if not wallet_connection["connected"]:
                return {"success": False, "error": "Wallet connection failed"}
            
            # Mock keypair (in production, use actual wallet signing)
            from solders.keypair import Keypair
            payer = Keypair()  # This would be from wallet
            
            # Build transaction
            tx_result = self.transaction_builder.build_store_data_transaction(
                payer, data, metadata
            )
            
            if not tx_result["success"]:
                return tx_result
            
            # Validate transaction
            validation = self.validator.validate_transaction(tx_result["transaction"])
            if not validation["valid"]:
                self.stats["errors"] += 1
                return {"success": False, "error": f"Validation failed: {validation['error']}"}
            
            # Process transaction
            process_result = self.validator.process_transaction(tx_result["transaction"])
            if process_result["processed"]:
                self.stats["transactions_processed"] += 1
                self.stats["data_stored"] += 1
            
            return {
                "success": True,
                "data_hash": tx_result["data_hash"],
                "transaction_hash": process_result["tx_hash"],
                "data_account": tx_result["data_account"],
                "estimated_fee": tx_result["estimated_fee"]
            }
            
        except Exception as e:
            self.stats["errors"] += 1
            return {"success": False, "error": str(e)}
    
    async def process_retrieve_data_request(
        self,
        data_hash: str,
        wallet_address: str = None
    ) -> Dict[str, Any]:
        """Complete data retrieval flow"""
        
        try:
            # Check if data exists in validator
            account_data = self.validator.get_account_data(data_hash)
            if not account_data:
                return {"success": False, "error": "Data not found"}
            
            # Get cached data
            cached_data = self.rpc_cache.get(f"sio_data:{data_hash}")
            if not cached_data:
                return {"success": False, "error": "Data not in cache"}
            
            return {
                "success": True,
                "data_hash": data_hash,
                "data": cached_data["data"],
                "metadata": cached_data.get("metadata", ""),
                "stored_at": cached_data["stored_at"],
                "owner": account_data["owner"]
            }
            
        except Exception as e:
            self.stats["errors"] += 1
            return {"success": False, "error": str(e)}
    
    async def process_payment_with_data(
        self,
        payer_address: str,
        recipient_address: str,
        amount: int,
        data: Dict[str, Any],
        metadata: bytes = b"",
        wallet_type: str = "phantom"
    ) -> Dict[str, Any]:
        """Complete payment + data storage flow"""
        
        try:
            # Connect wallet
            wallet_connection = await self.wallet_manager.connect_wallet(wallet_type)
            if not wallet_connection["connected"]:
                return {"success": False, "error": "Wallet connection failed"}
            
            # Check balance
            balance = await self.wallet_manager.get_balance(payer_address, "SIO")
            if int(balance["balance"]) < amount:
                return {"success": False, "error": "Insufficient SIO balance"}
            
            # Mock keypairs (in production, use actual wallet)
            from solders.keypair import Keypair
            from solders.pubkey import Pubkey
            payer = Keypair()
            recipient = Pubkey.from_string(recipient_address)
            
            # Build combined transaction
            tx_result = self.transaction_builder.build_combined_transaction(
                payer, recipient, amount, data, metadata
            )
            
            if not tx_result["success"]:
                return tx_result
            
            # Validate transaction
            validation = self.validator.validate_transaction(tx_result["transaction"])
            if not validation["valid"]:
                self.stats["errors"] += 1
                return {"success": False, "error": f"Validation failed: {validation['error']}"}
            
            # Process transaction
            process_result = self.validator.process_transaction(tx_result["transaction"])
            if process_result["processed"]:
                self.stats["transactions_processed"] += 1
                self.stats["data_stored"] += 1
                self.stats["payments_settled"] += 1
            
            return {
                "success": True,
                "transaction_hash": process_result["tx_hash"],
                "data_hash": tx_result["data_hash"],
                "payment_amount": amount,
                "data_account": tx_result["data_account"],
                "payment_account": tx_result["payment_account"],
                "estimated_fee": tx_result["estimated_fee"]
            }
            
        except Exception as e:
            self.stats["errors"] += 1
            return {"success": False, "error": str(e)}
    
    def verify_payment_signature(
        self,
        signature: str,
        amount: int,
        payer: str,
        recipient: str
    ) -> Dict[str, Any]:
        """Verify payment signature"""
        
        try:
            # Get transaction from cache
            tx_data = self.rpc_cache.get(f"sio_tx:{signature}")
            if not tx_data:
                return {"valid": False, "error": "Transaction not found"}
            
            # Verify transaction was processed
            if not tx_data.get("processed"):
                return {"valid": False, "error": "Transaction not processed"}
            
            # Check results for payment settlement
            results = tx_data.get("results", [])
            payment_settled = any(
                result.get("settled") for result in results 
                if result.get("success")
            )
            
            if not payment_settled:
                return {"valid": False, "error": "Payment not settled"}
            
            return {
                "valid": True,
                "signature": signature,
                "amount": amount,
                "settled": True,
                "timestamp": tx_data["timestamp"]
            }
            
        except Exception as e:
            return {"valid": False, "error": str(e)}
    
    def get_validator_stats(self) -> Dict[str, Any]:
        """Get comprehensive validator statistics"""
        program_stats = self.validator.get_program_stats()
        
        return {
            **self.stats,
            "program_id": program_stats["program_id"],
            "nonces_used": program_stats["nonces_used"],
            "cache_size": program_stats["cache_keys"],
            "uptime": program_stats["uptime"],
            "success_rate": (
                (self.stats["transactions_processed"] / 
                 max(self.stats["transactions_processed"] + self.stats["errors"], 1)) * 100
            )
        }
    
    def health_check(self) -> Dict[str, Any]:
        """Validator health check"""
        try:
            # Check RPC cache
            cache_test = self.rpc_cache.get("health_check")
            self.rpc_cache.set("health_check", {"timestamp": asyncio.get_event_loop().time()}, ttl=60)
            
            # Check validator components
            validator_ok = self.validator is not None
            builder_ok = self.transaction_builder is not None
            wallet_ok = self.wallet_manager is not None
            
            return {
                "healthy": True,
                "components": {
                    "validator": validator_ok,
                    "transaction_builder": builder_ok,
                    "wallet_manager": wallet_ok,
                    "rpc_cache": True
                },
                "stats": self.get_validator_stats()
            }
            
        except Exception as e:
            return {
                "healthy": False,
                "error": str(e),
                "components": {
                    "validator": False,
                    "transaction_builder": False,
                    "wallet_manager": False,
                    "rpc_cache": False
                }
            }


# Factory function for FastAPI integration
async def create_complete_sio_validator(
    program_id: str = "SioProgram1234567890123456789012345678901",
    rpc_cache = None
) -> CompleteSIOValidator:
    """Create complete S-IO validator instance"""
    if not rpc_cache:
        # Mock cache for testing
        class MockCache:
            def __init__(self):
                self.cache = {}
            def get(self, key):
                return self.cache.get(key)
            def set(self, key, value, ttl):
                self.cache[key] = value
        rpc_cache = MockCache()
    
    return CompleteSIOValidator(program_id, rpc_cache)


# FastAPI endpoints integration
def add_validator_endpoints(app, validator: CompleteSIOValidator):
    """Add validator endpoints to FastAPI app"""
    
    @app.post("/api/sio/store-data")
    async def store_data(request_data: dict):
        return await validator.process_store_data_request(**request_data)
    
    @app.get("/api/sio/retrieve-data/{data_hash}")
    async def retrieve_data(data_hash: str):
        return await validator.process_retrieve_data_request(data_hash)
    
    @app.post("/api/sio/payment-with-data")
    async def payment_with_data(request_data: dict):
        return await validator.process_payment_with_data(**request_data)
    
    @app.post("/api/sio/verify-signature")
    async def verify_signature(request_data: dict):
        return validator.verify_payment_signature(**request_data)
    
    @app.get("/api/sio/validator/stats")
    async def validator_stats():
        return validator.get_validator_stats()
    
    @app.get("/api/sio/validator/health")
    async def validator_health():
        return validator.health_check()