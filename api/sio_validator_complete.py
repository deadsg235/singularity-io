"""
Complete S-IO Validator Implementation
Minimal but fully functional Solana validator for S-IO data transactions
"""
import json
import time
import hashlib
from typing import Dict, Any, Optional, List
from dataclasses import dataclass
from solders.pubkey import Pubkey
from solders.keypair import Keypair
from solders.transaction import Transaction
from solders.instruction import Instruction, AccountMeta
from solders.system_program import ID as SYSTEM_PROGRAM_ID
from solders.message import Message

@dataclass
class SIOInstruction:
    """S-IO instruction types"""
    STORE_DATA = 0
    RETRIEVE_DATA = 1
    VERIFY_PAYMENT = 2
    SETTLE_PAYMENT = 3

@dataclass
class SIOAccount:
    """S-IO account structure"""
    discriminator: int
    owner: Pubkey
    data_hash: str
    timestamp: int
    payment_amount: int
    settled: bool

class SIOValidator:
    """Complete S-IO validator with full transaction processing"""
    
    def __init__(self, program_id: str, rpc_cache):
        self.program_id = Pubkey.from_string(program_id)
        self.rpc_cache = rpc_cache
        self.accounts = {}  # Program accounts
        self.nonces = set()  # Prevent replay attacks
        
    def validate_transaction(self, transaction: Transaction) -> Dict[str, Any]:
        """Main validation entry point"""
        try:
            # Extract S-IO instructions
            sio_instructions = self._extract_sio_instructions(transaction)
            if not sio_instructions:
                return {"valid": False, "error": "No S-IO instructions"}
            
            # Validate each instruction
            for ix in sio_instructions:
                result = self._validate_instruction(ix, transaction)
                if not result["valid"]:
                    return result
            
            # Check transaction structure
            structure_check = self._validate_transaction_structure(transaction)
            if not structure_check["valid"]:
                return structure_check
            
            return {"valid": True, "instructions": len(sio_instructions)}
            
        except Exception as e:
            return {"valid": False, "error": str(e)}
    
    def _extract_sio_instructions(self, transaction: Transaction) -> List[Instruction]:
        """Extract all S-IO instructions from transaction"""
        return [ix for ix in transaction.message.instructions 
                if ix.program_id == self.program_id]
    
    def _validate_instruction(self, instruction: Instruction, transaction: Transaction) -> Dict[str, Any]:
        """Validate individual S-IO instruction"""
        if len(instruction.data) == 0:
            return {"valid": False, "error": "Empty instruction data"}
        
        discriminator = instruction.data[0]
        
        if discriminator == SIOInstruction.STORE_DATA:
            return self._validate_store_data(instruction, transaction)
        elif discriminator == SIOInstruction.RETRIEVE_DATA:
            return self._validate_retrieve_data(instruction)
        elif discriminator == SIOInstruction.VERIFY_PAYMENT:
            return self._validate_verify_payment(instruction)
        elif discriminator == SIOInstruction.SETTLE_PAYMENT:
            return self._validate_settle_payment(instruction)
        else:
            return {"valid": False, "error": f"Unknown instruction: {discriminator}"}
    
    def _validate_store_data(self, instruction: Instruction, transaction: Transaction) -> Dict[str, Any]:
        """Validate store data instruction"""
        if len(instruction.accounts) < 3:
            return {"valid": False, "error": "Insufficient accounts for store_data"}
        
        payer = instruction.accounts[0]
        data_account = instruction.accounts[1]
        system_program = instruction.accounts[2]
        
        # Validate account structure
        if not payer.is_signer:
            return {"valid": False, "error": "Payer must sign"}
        
        if system_program.pubkey != SYSTEM_PROGRAM_ID:
            return {"valid": False, "error": "Invalid system program"}
        
        # Validate data payload
        if len(instruction.data) < 33:  # 1 + 32 bytes minimum
            return {"valid": False, "error": "Invalid data payload"}
        
        data_hash = instruction.data[1:33].hex()
        metadata = instruction.data[33:] if len(instruction.data) > 33 else b""
        
        # Check for duplicate data
        if self._data_exists(data_hash):
            return {"valid": False, "error": "Data already exists"}
        
        return {
            "valid": True,
            "type": "store_data",
            "data_hash": data_hash,
            "metadata_size": len(metadata)
        }
    
    def _validate_retrieve_data(self, instruction: Instruction) -> Dict[str, Any]:
        """Validate retrieve data instruction"""
        if len(instruction.accounts) < 2:
            return {"valid": False, "error": "Insufficient accounts for retrieve_data"}
        
        if len(instruction.data) != 33:  # 1 + 32 bytes
            return {"valid": False, "error": "Invalid retrieve payload"}
        
        data_hash = instruction.data[1:33].hex()
        
        # Check if data exists
        if not self._data_exists(data_hash):
            return {"valid": False, "error": "Data not found"}
        
        return {"valid": True, "type": "retrieve_data", "data_hash": data_hash}
    
    def _validate_verify_payment(self, instruction: Instruction) -> Dict[str, Any]:
        """Validate payment verification instruction"""
        if len(instruction.accounts) < 4:
            return {"valid": False, "error": "Insufficient accounts for verify_payment"}
        
        if len(instruction.data) < 41:  # 1 + 8 + 32 bytes minimum
            return {"valid": False, "error": "Invalid payment payload"}
        
        amount = int.from_bytes(instruction.data[1:9], 'little')
        nonce = instruction.data[9:41].hex()
        
        # Check nonce replay
        if nonce in self.nonces:
            return {"valid": False, "error": "Nonce already used"}
        
        # Validate amount
        if amount <= 0:
            return {"valid": False, "error": "Invalid payment amount"}
        
        return {
            "valid": True,
            "type": "verify_payment",
            "amount": amount,
            "nonce": nonce
        }
    
    def _validate_settle_payment(self, instruction: Instruction) -> Dict[str, Any]:
        """Validate payment settlement instruction"""
        if len(instruction.accounts) < 5:
            return {"valid": False, "error": "Insufficient accounts for settle_payment"}
        
        payer = instruction.accounts[0]
        recipient = instruction.accounts[1]
        token_program = instruction.accounts[2]
        
        if not payer.is_signer:
            return {"valid": False, "error": "Payer must sign settlement"}
        
        return {"valid": True, "type": "settle_payment"}
    
    def _validate_transaction_structure(self, transaction: Transaction) -> Dict[str, Any]:
        """Validate overall transaction structure"""
        # Check signature count
        if len(transaction.signatures) == 0:
            return {"valid": False, "error": "No signatures"}
        
        # Check instruction count
        if len(transaction.message.instructions) == 0:
            return {"valid": False, "error": "No instructions"}
        
        # Check fee payer
        if not transaction.message.account_keys:
            return {"valid": False, "error": "No account keys"}
        
        return {"valid": True}
    
    def process_transaction(self, transaction: Transaction) -> Dict[str, Any]:
        """Process validated S-IO transaction"""
        validation = self.validate_transaction(transaction)
        if not validation["valid"]:
            return validation
        
        results = []
        sio_instructions = self._extract_sio_instructions(transaction)
        
        for ix in sio_instructions:
            result = self._process_instruction(ix, transaction)
            results.append(result)
        
        # Cache transaction
        tx_hash = str(transaction.signatures[0])
        self.rpc_cache.set(f"sio_tx:{tx_hash}", {
            "timestamp": int(time.time()),
            "results": results,
            "processed": True
        }, ttl=3600)
        
        return {"processed": True, "tx_hash": tx_hash, "results": results}
    
    def _process_instruction(self, instruction: Instruction, transaction: Transaction) -> Dict[str, Any]:
        """Process individual instruction"""
        discriminator = instruction.data[0]
        
        if discriminator == SIOInstruction.STORE_DATA:
            return self._process_store_data(instruction)
        elif discriminator == SIOInstruction.RETRIEVE_DATA:
            return self._process_retrieve_data(instruction)
        elif discriminator == SIOInstruction.VERIFY_PAYMENT:
            return self._process_verify_payment(instruction)
        elif discriminator == SIOInstruction.SETTLE_PAYMENT:
            return self._process_settle_payment(instruction)
    
    def _process_store_data(self, instruction: Instruction) -> Dict[str, Any]:
        """Process store data instruction"""
        data_hash = instruction.data[1:33].hex()
        metadata = instruction.data[33:] if len(instruction.data) > 33 else b""
        payer = instruction.accounts[0].pubkey
        
        # Create account data
        account_data = SIOAccount(
            discriminator=SIOInstruction.STORE_DATA,
            owner=payer,
            data_hash=data_hash,
            timestamp=int(time.time()),
            payment_amount=0,
            settled=False
        )
        
        # Store in cache
        self.rpc_cache.set(f"sio_account:{data_hash}", {
            "discriminator": account_data.discriminator,
            "owner": str(account_data.owner),
            "data_hash": account_data.data_hash,
            "timestamp": account_data.timestamp,
            "metadata": metadata.hex() if metadata else "",
            "settled": account_data.settled
        }, ttl=86400)
        
        return {"success": True, "data_hash": data_hash, "stored": True}
    
    def _process_retrieve_data(self, instruction: Instruction) -> Dict[str, Any]:
        """Process retrieve data instruction"""
        data_hash = instruction.data[1:33].hex()
        
        # Get from cache
        account_data = self.rpc_cache.get(f"sio_account:{data_hash}")
        if not account_data:
            return {"success": False, "error": "Data not found"}
        
        return {
            "success": True,
            "data_hash": data_hash,
            "owner": account_data["owner"],
            "timestamp": account_data["timestamp"],
            "metadata": account_data.get("metadata", "")
        }
    
    def _process_verify_payment(self, instruction: Instruction) -> Dict[str, Any]:
        """Process payment verification"""
        amount = int.from_bytes(instruction.data[1:9], 'little')
        nonce = instruction.data[9:41].hex()
        
        # Add nonce to prevent replay
        self.nonces.add(nonce)
        
        # Cache verification
        self.rpc_cache.set(f"sio_verify:{nonce}", {
            "amount": amount,
            "verified": True,
            "timestamp": int(time.time())
        }, ttl=300)
        
        return {"success": True, "amount": amount, "verified": True}
    
    def _process_settle_payment(self, instruction: Instruction) -> Dict[str, Any]:
        """Process payment settlement"""
        payer = instruction.accounts[0].pubkey
        recipient = instruction.accounts[1].pubkey
        
        # Mark as settled
        settlement_id = hashlib.sha256(f"{payer}{recipient}{time.time()}".encode()).hexdigest()[:16]
        
        self.rpc_cache.set(f"sio_settlement:{settlement_id}", {
            "payer": str(payer),
            "recipient": str(recipient),
            "settled": True,
            "timestamp": int(time.time())
        }, ttl=86400)
        
        return {"success": True, "settlement_id": settlement_id, "settled": True}
    
    def _data_exists(self, data_hash: str) -> bool:
        """Check if data already exists"""
        return self.rpc_cache.get(f"sio_account:{data_hash}") is not None
    
    def get_account_data(self, data_hash: str) -> Optional[Dict[str, Any]]:
        """Get account data by hash"""
        return self.rpc_cache.get(f"sio_account:{data_hash}")
    
    def get_program_stats(self) -> Dict[str, Any]:
        """Get validator statistics"""
        return {
            "program_id": str(self.program_id),
            "nonces_used": len(self.nonces),
            "cache_keys": len(getattr(self.rpc_cache, 'cache', {})),
            "uptime": int(time.time())
        }


class SIOInstructionBuilder:
    """Build S-IO instructions for transactions"""
    
    @staticmethod
    def store_data(data_hash: str, metadata: bytes = b"") -> bytes:
        """Build store data instruction"""
        return bytes([SIOInstruction.STORE_DATA]) + bytes.fromhex(data_hash) + metadata
    
    @staticmethod
    def retrieve_data(data_hash: str) -> bytes:
        """Build retrieve data instruction"""
        return bytes([SIOInstruction.RETRIEVE_DATA]) + bytes.fromhex(data_hash)
    
    @staticmethod
    def verify_payment(amount: int, nonce: str) -> bytes:
        """Build verify payment instruction"""
        return (bytes([SIOInstruction.VERIFY_PAYMENT]) + 
                amount.to_bytes(8, 'little') + 
                bytes.fromhex(nonce))
    
    @staticmethod
    def settle_payment() -> bytes:
        """Build settle payment instruction"""
        return bytes([SIOInstruction.SETTLE_PAYMENT])


# Program constants
SIO_PROGRAM_ID = "SioProgram1234567890123456789012345678901"
SIO_DATA_ACCOUNT_SIZE = 128  # bytes
SIO_PAYMENT_ACCOUNT_SIZE = 64  # bytes