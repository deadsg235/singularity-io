"""
Enhanced Wallet Integration for S-IO Protocol
Uses RPC cache and supports multiple wallet types
"""
import json
import asyncio
from typing import Dict, Any, Optional, List
from solders.pubkey import Pubkey
from solders.keypair import Keypair
from solders.transaction import Transaction
from solders.message import Message

class SIOWalletManager:
    """Enhanced wallet manager with RPC cache integration"""
    
    def __init__(self, rpc_cache):
        self.rpc_cache = rpc_cache
        self.connected_wallets = {}
        self.supported_wallets = [
            "phantom", "solflare", "backpack", "glow", "slope"
        ]
    
    async def connect_wallet(self, wallet_type: str = "phantom") -> Dict[str, Any]:
        """Connect to wallet with caching"""
        cache_key = f"wallet:{wallet_type}"
        cached = self.rpc_cache.get(cache_key)
        
        if cached and cached.get("connected"):
            return cached
        
        # Mock connection for different wallet types
        connection_data = {
            "connected": True,
            "wallet_type": wallet_type,
            "public_key": f"{wallet_type}_wallet_123456789",
            "timestamp": asyncio.get_event_loop().time()
        }
        
        self.rpc_cache.set(cache_key, connection_data, ttl=3600)
        self.connected_wallets[wallet_type] = connection_data
        
        return connection_data
    
    async def get_balance(self, wallet_address: str, token_mint: str = None) -> Dict[str, Any]:
        """Get wallet balance using RPC cache"""
        cache_key = f"balance:{wallet_address}:{token_mint or 'SOL'}"
        cached = self.rpc_cache.get(cache_key)
        
        if cached:
            return cached
        
        # Mock balance data
        balance_data = {
            "address": wallet_address,
            "token": token_mint or "SOL",
            "balance": "1000000000" if not token_mint else "5000000",  # 1 SOL or 5 SIO
            "decimals": 9 if not token_mint else 6,
            "cached_at": asyncio.get_event_loop().time()
        }
        
        self.rpc_cache.set(cache_key, balance_data, ttl=30)  # 30s cache
        return balance_data
    
    async def sign_transaction(self, transaction: Transaction, wallet_type: str = "phantom") -> Dict[str, Any]:
        """Sign transaction with wallet"""
        wallet_data = self.connected_wallets.get(wallet_type)
        if not wallet_data:
            return {"success": False, "error": "Wallet not connected"}
        
        # Mock signing
        signed_data = {
            "success": True,
            "signature": f"sig_{wallet_type}_{hash(str(transaction))%1000000}",
            "transaction": str(transaction),
            "wallet": wallet_type
        }
        
        return signed_data
    
    def get_wallet_adapter_config(self) -> Dict[str, Any]:
        """Get wallet adapter configuration"""
        return {
            "wallets": [
                {
                    "name": "Phantom",
                    "url": "https://phantom.app/",
                    "icon": "phantom-icon.svg",
                    "adapter": "phantom"
                },
                {
                    "name": "Solflare",
                    "url": "https://solflare.com/",
                    "icon": "solflare-icon.svg", 
                    "adapter": "solflare"
                },
                {
                    "name": "Backpack",
                    "url": "https://backpack.app/",
                    "icon": "backpack-icon.svg",
                    "adapter": "backpack"
                }
            ],
            "network": "mainnet-beta",
            "commitment": "confirmed"
        }


class SIOTransactionBuilder:
    """Build S-IO transactions with validator integration"""
    
    def __init__(self, wallet_manager: SIOWalletManager, validator, rpc_cache):
        self.wallet_manager = wallet_manager
        self.validator = validator
        self.rpc_cache = rpc_cache
    
    async def build_payment_transaction(
        self,
        payer: str,
        recipient: str,
        amount: str,
        token_mint: str,
        data_payload: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Build S-IO payment transaction with optional data"""
        
        try:
            payer_pubkey = Pubkey.from_string(payer)
            recipient_pubkey = Pubkey.from_string(recipient)
            
            # Create base transfer instruction
            transfer_ix = self._create_transfer_instruction(
                payer_pubkey, recipient_pubkey, int(amount), token_mint
            )
            
            instructions = [transfer_ix]
            
            # Add data instruction if provided
            if data_payload:
                data_ix = self._create_data_instruction(payer_pubkey, data_payload)
                instructions.append(data_ix)
            
            # Build transaction
            transaction = Transaction.new_with_payer(instructions, payer_pubkey)
            
            return {
                "success": True,
                "transaction": transaction,
                "instructions": len(instructions),
                "estimated_fee": 5000 * len(instructions)
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def _create_transfer_instruction(self, payer: Pubkey, recipient: Pubkey, amount: int, token_mint: str):
        """Create SPL token transfer instruction"""
        from solders.system_program import transfer, TransferParams
        
        # For SOL transfers
        if not token_mint or token_mint == "SOL":
            return transfer(TransferParams(
                from_pubkey=payer,
                to_pubkey=recipient,
                lamports=amount
            ))
        
        # For SPL token transfers (simplified)
        # In production, use actual SPL token instruction
        return transfer(TransferParams(
            from_pubkey=payer,
            to_pubkey=recipient,
            lamports=5000  # Base fee
        ))
    
    def _create_data_instruction(self, payer: Pubkey, data_payload: Dict[str, Any]):
        """Create S-IO data instruction"""
        from solders.instruction import Instruction, AccountMeta
        
        # Store data in validator
        store_result = self.validator.data_transmitter.store_data(data_payload, payer)
        
        if not store_result["success"]:
            raise Exception(f"Data storage failed: {store_result.get('error')}")
        
        # Create instruction
        instruction_data = bytes.fromhex(store_result["instruction"])
        
        return Instruction(
            program_id=self.validator.program_id,
            accounts=[
                AccountMeta(pubkey=payer, is_signer=True, is_writable=True),
                AccountMeta(pubkey=Pubkey.default(), is_signer=False, is_writable=True),  # Data account
                AccountMeta(pubkey=Pubkey.from_string("11111111111111111111111111111111"), is_signer=False, is_writable=False)  # System program
            ],
            data=instruction_data
        )


# Enhanced JavaScript wallet integration
ENHANCED_WALLET_JS = """
class EnhancedSIOWallet {
    constructor(rpcCache) {
        this.rpcCache = rpcCache;
        this.wallet = null;
        this.walletType = null;
    }
    
    async detectWallets() {
        const wallets = [];
        
        if (window.solana?.isPhantom) wallets.push({name: 'Phantom', adapter: window.solana});
        if (window.solflare?.isSolflare) wallets.push({name: 'Solflare', adapter: window.solflare});
        if (window.backpack?.isBackpack) wallets.push({name: 'Backpack', adapter: window.backpack});
        if (window.glow) wallets.push({name: 'Glow', adapter: window.glow});
        
        return wallets;
    }
    
    async connect(walletName = 'Phantom') {
        const wallets = await this.detectWallets();
        const wallet = wallets.find(w => w.name === walletName);
        
        if (!wallet) throw new Error(`${walletName} wallet not found`);
        
        const response = await wallet.adapter.connect();
        this.wallet = wallet.adapter;
        this.walletType = walletName;
        
        // Cache connection
        this.rpcCache.set(`wallet:${walletName.toLowerCase()}`, {
            connected: true,
            publicKey: response.publicKey.toString(),
            walletType: walletName
        }, 3600);
        
        return response;
    }
    
    async getBalance(tokenMint = null) {
        if (!this.wallet) throw new Error('Wallet not connected');
        
        const cacheKey = `balance:${this.wallet.publicKey}:${tokenMint || 'SOL'}`;
        const cached = this.rpcCache.get(cacheKey);
        
        if (cached) return cached;
        
        // Get balance from RPC
        const balance = await this.fetchBalance(tokenMint);
        this.rpcCache.set(cacheKey, balance, 30);
        
        return balance;
    }
    
    async signAndSendTransaction(transaction) {
        if (!this.wallet) throw new Error('Wallet not connected');
        
        const signed = await this.wallet.signTransaction(transaction);
        const signature = await this.sendTransaction(signed);
        
        return {signature, transaction: signed};
    }
}
"""