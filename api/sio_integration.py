"""
S-IO Integration Layer
Connects validator, wallet manager, and RPC cache for complete functionality
"""
import asyncio
from typing import Dict, Any, Optional
from .sio_validator import SIOValidator, SIODataTransmitter
from .sio_wallet_manager import SIOWalletManager, SIOTransactionBuilder

class SIOIntegration:
    """Complete S-IO protocol integration"""
    
    def __init__(self, rpc_cache, program_id: str = "SioProgram1234567890123456789012345678901"):
        self.rpc_cache = rpc_cache
        
        # Initialize components
        self.validator = SIOValidator(program_id, rpc_cache)
        self.validator.data_transmitter = SIODataTransmitter(self.validator, rpc_cache)
        self.wallet_manager = SIOWalletManager(rpc_cache)
        self.transaction_builder = SIOTransactionBuilder(
            self.wallet_manager, self.validator, rpc_cache
        )
    
    async def process_payment_with_data(
        self,
        payer: str,
        recipient: str,
        amount: str,
        token_mint: str,
        data_payload: Optional[Dict[str, Any]] = None,
        wallet_type: str = "phantom"
    ) -> Dict[str, Any]:
        """Complete payment processing with optional data transmission"""
        
        try:
            # Connect wallet
            wallet_connection = await self.wallet_manager.connect_wallet(wallet_type)
            if not wallet_connection["connected"]:
                return {"success": False, "error": "Wallet connection failed"}
            
            # Check balance
            balance = await self.wallet_manager.get_balance(payer, token_mint)
            if int(balance["balance"]) < int(amount):
                return {"success": False, "error": "Insufficient balance"}
            
            # Build transaction
            tx_result = await self.transaction_builder.build_payment_transaction(
                payer, recipient, amount, token_mint, data_payload
            )
            
            if not tx_result["success"]:
                return tx_result
            
            # Sign transaction
            sign_result = await self.wallet_manager.sign_transaction(
                tx_result["transaction"], wallet_type
            )
            
            if not sign_result["success"]:
                return sign_result
            
            # Validate transaction
            validation = self.validator.validate_data_transaction(tx_result["transaction"])
            if not validation["valid"]:
                return {"success": False, "error": f"Validation failed: {validation['error']}"}
            
            # Process transaction
            process_result = self.validator.process_data_transaction(tx_result["transaction"])
            
            return {
                "success": True,
                "transaction_hash": process_result["tx_hash"],
                "signature": sign_result["signature"],
                "data_hash": validation.get("data_hash"),
                "estimated_fee": tx_result["estimated_fee"]
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def retrieve_data_by_hash(self, data_hash: str) -> Dict[str, Any]:
        """Retrieve data using hash"""
        return self.validator.data_transmitter.retrieve_data(data_hash)
    
    def get_integration_status(self) -> Dict[str, Any]:
        """Get status of all integration components"""
        return {
            "validator": {
                "program_id": str(self.validator.program_id),
                "data_accounts": len(self.validator.data_accounts)
            },
            "wallet_manager": {
                "connected_wallets": len(self.wallet_manager.connected_wallets),
                "supported_wallets": self.wallet_manager.supported_wallets
            },
            "rpc_cache": {
                "cache_size": len(getattr(self.rpc_cache, 'cache', {})),
                "status": "active"
            }
        }


# FastAPI integration
async def create_sio_integration(rpc_cache) -> SIOIntegration:
    """Factory function for S-IO integration"""
    return SIOIntegration(rpc_cache)


# Middleware integration
def integrate_sio_with_middleware(app, rpc_cache):
    """Integrate S-IO with FastAPI middleware"""
    
    @app.on_event("startup")
    async def startup_sio():
        app.state.sio_integration = await create_sio_integration(rpc_cache)
    
    @app.middleware("http")
    async def sio_middleware(request, call_next):
        # Add S-IO integration to request state
        if hasattr(app.state, 'sio_integration'):
            request.state.sio = app.state.sio_integration
        
        response = await call_next(request)
        return response
    
    return app


# Example usage endpoints
def add_sio_endpoints(app, sio_integration: SIOIntegration):
    """Add S-IO specific endpoints"""
    
    @app.post("/api/sio/process-payment")
    async def process_sio_payment(request_data: dict):
        return await sio_integration.process_payment_with_data(**request_data)
    
    @app.get("/api/sio/data/{data_hash}")
    async def get_sio_data(data_hash: str):
        return await sio_integration.retrieve_data_by_hash(data_hash)
    
    @app.get("/api/sio/status")
    async def get_sio_status():
        return sio_integration.get_integration_status()


# Recommended wallet integration repos
RECOMMENDED_REPOS = {
    "solana_wallet_adapter": {
        "url": "https://github.com/solana-labs/wallet-adapter",
        "description": "Official Solana wallet adapter",
        "integration": "Use @solana/wallet-adapter-react for React apps"
    },
    "phantom_sdk": {
        "url": "https://github.com/phantom-labs/phantom-sdk",
        "description": "Phantom wallet SDK",
        "integration": "Direct integration with Phantom features"
    },
    "solflare_sdk": {
        "url": "https://github.com/solflare-wallet/solflare-sdk",
        "description": "Solflare wallet SDK",
        "integration": "Multi-platform Solflare support"
    },
    "backpack_sdk": {
        "url": "https://github.com/coral-xyz/backpack",
        "description": "Backpack wallet integration",
        "integration": "xNFT and advanced features"
    },
    "solana_web3": {
        "url": "https://github.com/solana-labs/solana-web3.js",
        "description": "Core Solana web3 library",
        "integration": "Essential for all Solana interactions"
    }
}