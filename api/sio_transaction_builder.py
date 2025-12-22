"""
S-IO Transaction Builder
Complete transaction building for S-IO validator operations
"""
import hashlib
import time
from typing import Dict, Any, List, Optional
from solders.pubkey import Pubkey
from solders.keypair import Keypair
from solders.transaction import Transaction
from solders.instruction import Instruction, AccountMeta
from solders.message import Message
from solders.system_program import ID as SYSTEM_PROGRAM_ID
from .sio_validator_complete import SIOInstructionBuilder, SIOInstruction

class SIOTransactionBuilder:
    """Build complete S-IO transactions"""
    
    def __init__(self, program_id: str, rpc_cache):
        self.program_id = Pubkey.from_string(program_id)
        self.rpc_cache = rpc_cache
        self.instruction_builder = SIOInstructionBuilder()
    
    def build_store_data_transaction(
        self,
        payer: Keypair,
        data: Dict[str, Any],
        metadata: bytes = b""
    ) -> Dict[str, Any]:
        """Build transaction to store data on-chain"""
        
        # Hash the data
        data_json = self._serialize_data(data)
        data_hash = hashlib.sha256(data_json.encode()).hexdigest()
        
        # Generate data account keypair
        data_account = Keypair()
        
        # Build instruction
        instruction_data = self.instruction_builder.store_data(data_hash, metadata)
        
        instruction = Instruction(
            program_id=self.program_id,
            accounts=[
                AccountMeta(pubkey=payer.pubkey(), is_signer=True, is_writable=True),
                AccountMeta(pubkey=data_account.pubkey(), is_signer=True, is_writable=True),
                AccountMeta(pubkey=SYSTEM_PROGRAM_ID, is_signer=False, is_writable=False)
            ],
            data=instruction_data
        )
        
        # Build transaction
        message = Message.new_with_blockhash(
            [instruction],
            payer.pubkey(),
            self._get_recent_blockhash()
        )
        
        transaction = Transaction.new_unsigned(message)
        transaction.sign([payer, data_account], message.recent_blockhash)
        
        # Cache data locally
        self.rpc_cache.set(f"sio_data:{data_hash}", {
            "data": data,
            "metadata": metadata.hex() if metadata else "",
            "stored_at": int(time.time()),
            "payer": str(payer.pubkey()),
            "data_account": str(data_account.pubkey())
        }, ttl=86400)
        
        return {
            "success": True,
            "transaction": transaction,
            "data_hash": data_hash,
            "data_account": str(data_account.pubkey()),
            "estimated_fee": 5000
        }
    
    def build_retrieve_data_transaction(
        self,
        payer: Keypair,
        data_hash: str
    ) -> Dict[str, Any]:
        """Build transaction to retrieve data"""
        
        # Get data account from cache
        cached_data = self.rpc_cache.get(f"sio_data:{data_hash}")
        if not cached_data:
            return {"success": False, "error": "Data not found in cache"}
        
        data_account = Pubkey.from_string(cached_data["data_account"])
        
        # Build instruction
        instruction_data = self.instruction_builder.retrieve_data(data_hash)
        
        instruction = Instruction(
            program_id=self.program_id,
            accounts=[
                AccountMeta(pubkey=data_account, is_signer=False, is_writable=False)
            ],
            data=instruction_data
        )
        
        # Build transaction
        message = Message.new_with_blockhash(
            [instruction],
            payer.pubkey(),
            self._get_recent_blockhash()
        )
        
        transaction = Transaction.new_unsigned(message)
        transaction.sign([payer], message.recent_blockhash)
        
        return {
            "success": True,
            "transaction": transaction,
            "data_hash": data_hash,
            "data": cached_data["data"],
            "estimated_fee": 5000
        }
    
    def build_payment_transaction(
        self,
        payer: Keypair,
        recipient: Pubkey,
        amount: int,
        nonce: Optional[str] = None
    ) -> Dict[str, Any]:
        """Build complete payment transaction with verification and settlement"""
        
        if not nonce:
            nonce = hashlib.sha256(f"{payer.pubkey()}{recipient}{amount}{time.time()}".encode()).hexdigest()
        
        # Generate payment account
        payment_account = Keypair()
        
        instructions = []
        
        # 1. Verify payment instruction
        verify_data = self.instruction_builder.verify_payment(amount, nonce)
        verify_instruction = Instruction(
            program_id=self.program_id,
            accounts=[
                AccountMeta(pubkey=payer.pubkey(), is_signer=True, is_writable=True),
                AccountMeta(pubkey=recipient, is_signer=False, is_writable=False),
                AccountMeta(pubkey=payment_account.pubkey(), is_signer=True, is_writable=True),
                AccountMeta(pubkey=SYSTEM_PROGRAM_ID, is_signer=False, is_writable=False)
            ],
            data=verify_data
        )
        instructions.append(verify_instruction)
        
        # 2. Settle payment instruction
        settle_data = self.instruction_builder.settle_payment()
        settle_instruction = Instruction(
            program_id=self.program_id,
            accounts=[
                AccountMeta(pubkey=payer.pubkey(), is_signer=True, is_writable=True),
                AccountMeta(pubkey=recipient, is_signer=False, is_writable=True),
                AccountMeta(pubkey=payment_account.pubkey(), is_signer=False, is_writable=True)
            ],
            data=settle_data
        )
        instructions.append(settle_instruction)
        
        # Build transaction
        message = Message.new_with_blockhash(
            instructions,
            payer.pubkey(),
            self._get_recent_blockhash()
        )
        
        transaction = Transaction.new_unsigned(message)
        transaction.sign([payer, payment_account], message.recent_blockhash)
        
        return {
            "success": True,
            "transaction": transaction,
            "amount": amount,
            "nonce": nonce,
            "payment_account": str(payment_account.pubkey()),
            "estimated_fee": 10000  # Two instructions
        }
    
    def build_combined_transaction(
        self,
        payer: Keypair,
        recipient: Pubkey,
        amount: int,
        data: Dict[str, Any],
        metadata: bytes = b""
    ) -> Dict[str, Any]:
        """Build transaction combining payment and data storage"""
        
        # Generate accounts
        data_account = Keypair()
        payment_account = Keypair()
        
        # Hash data
        data_json = self._serialize_data(data)
        data_hash = hashlib.sha256(data_json.encode()).hexdigest()
        nonce = hashlib.sha256(f"{payer.pubkey()}{amount}{time.time()}".encode()).hexdigest()
        
        instructions = []
        
        # 1. Store data
        store_data = self.instruction_builder.store_data(data_hash, metadata)
        store_instruction = Instruction(
            program_id=self.program_id,
            accounts=[
                AccountMeta(pubkey=payer.pubkey(), is_signer=True, is_writable=True),
                AccountMeta(pubkey=data_account.pubkey(), is_signer=True, is_writable=True),
                AccountMeta(pubkey=SYSTEM_PROGRAM_ID, is_signer=False, is_writable=False)
            ],
            data=store_data
        )
        instructions.append(store_instruction)
        
        # 2. Verify payment
        verify_data = self.instruction_builder.verify_payment(amount, nonce)
        verify_instruction = Instruction(
            program_id=self.program_id,
            accounts=[
                AccountMeta(pubkey=payer.pubkey(), is_signer=True, is_writable=True),
                AccountMeta(pubkey=recipient, is_signer=False, is_writable=False),
                AccountMeta(pubkey=payment_account.pubkey(), is_signer=True, is_writable=True),
                AccountMeta(pubkey=SYSTEM_PROGRAM_ID, is_signer=False, is_writable=False)
            ],
            data=verify_data
        )
        instructions.append(verify_instruction)
        
        # 3. Settle payment
        settle_data = self.instruction_builder.settle_payment()
        settle_instruction = Instruction(
            program_id=self.program_id,
            accounts=[
                AccountMeta(pubkey=payer.pubkey(), is_signer=True, is_writable=True),
                AccountMeta(pubkey=recipient, is_signer=False, is_writable=True),
                AccountMeta(pubkey=payment_account.pubkey(), is_signer=False, is_writable=True)
            ],
            data=settle_data
        )
        instructions.append(settle_instruction)
        
        # Build transaction
        message = Message.new_with_blockhash(
            instructions,
            payer.pubkey(),
            self._get_recent_blockhash()
        )
        
        transaction = Transaction.new_unsigned(message)
        transaction.sign([payer, data_account, payment_account], message.recent_blockhash)
        
        # Cache data
        self.rpc_cache.set(f"sio_data:{data_hash}", {
            "data": data,
            "metadata": metadata.hex() if metadata else "",
            "stored_at": int(time.time()),
            "payer": str(payer.pubkey()),
            "data_account": str(data_account.pubkey())
        }, ttl=86400)
        
        return {
            "success": True,
            "transaction": transaction,
            "data_hash": data_hash,
            "amount": amount,
            "nonce": nonce,
            "data_account": str(data_account.pubkey()),
            "payment_account": str(payment_account.pubkey()),
            "estimated_fee": 15000  # Three instructions
        }
    
    def _serialize_data(self, data: Dict[str, Any]) -> str:
        """Serialize data for hashing"""
        import json
        return json.dumps(data, sort_keys=True, separators=(',', ':'))
    
    def _get_recent_blockhash(self) -> str:
        """Get recent blockhash (mock for now)"""
        # In production, fetch from RPC
        return "11111111111111111111111111111111"
    
    def estimate_transaction_cost(self, instruction_count: int) -> int:
        """Estimate transaction cost"""
        base_fee = 5000  # Base transaction fee
        instruction_fee = 5000 * instruction_count
        return base_fee + instruction_fee
    
    def get_transaction_status(self, signature: str) -> Dict[str, Any]:
        """Get transaction status from cache"""
        return self.rpc_cache.get(f"sio_tx:{signature}") or {"status": "unknown"}


# Factory function
def create_sio_transaction_builder(program_id: str, rpc_cache) -> SIOTransactionBuilder:
    """Create S-IO transaction builder"""
    return SIOTransactionBuilder(program_id, rpc_cache)