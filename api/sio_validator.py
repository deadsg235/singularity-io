"""
S-IO Custom Validator
Minimal Solana validator for S-IO data transactions and transmission
"""
import json
import time
from typing import Dict, Any, Optional
from solders.pubkey import Pubkey
from solders.transaction import Transaction
from solders.instruction import Instruction, AccountMeta
from solders.system_program import ID as SYSTEM_PROGRAM_ID

class SIOValidator:
    """Custom validator for S-IO data transactions"""
    
    def __init__(self, program_id: str, rpc_cache):
        self.program_id = Pubkey.from_string(program_id)
        self.rpc_cache = rpc_cache
        self.data_accounts = {}  # Cache for data accounts
        
    def validate_data_transaction(self, transaction: Transaction) -> Dict[str, Any]:
        """Validate S-IO data transaction"""
        try:
            # Extract S-IO instruction
            sio_ix = self._extract_sio_instruction(transaction)
            if not sio_ix:
                return {"valid": False, "error": "No S-IO instruction found"}
            
            # Validate instruction structure
            validation = self._validate_instruction(sio_ix)
            if not validation["valid"]:
                return validation
            
            # Validate data payload
            data_validation = self._validate_data_payload(sio_ix.data)
            if not data_validation["valid"]:
                return data_validation
            
            return {"valid": True, "instruction": sio_ix, "data_hash": data_validation["hash"]}
            
        except Exception as e:
            return {"valid": False, "error": str(e)}
    
    def _extract_sio_instruction(self, transaction: Transaction) -> Optional[Instruction]:
        """Extract S-IO instruction from transaction"""
        for ix in transaction.message.instructions:
            if ix.program_id == self.program_id:
                return ix
        return None
    
    def _validate_instruction(self, instruction: Instruction) -> Dict[str, Any]:
        """Validate S-IO instruction structure"""
        # Check minimum accounts (payer, data_account, system_program)
        if len(instruction.accounts) < 3:
            return {"valid": False, "error": "Insufficient accounts"}
        
        # Validate account structure
        payer = instruction.accounts[0]
        data_account = instruction.accounts[1]
        system_program = instruction.accounts[2]
        
        if not payer.is_signer:
            return {"valid": False, "error": "Payer must be signer"}
        
        if system_program.pubkey != SYSTEM_PROGRAM_ID:
            return {"valid": False, "error": "Invalid system program"}
        
        return {"valid": True}
    
    def _validate_data_payload(self, data: bytes) -> Dict[str, Any]:
        """Validate S-IO data payload"""
        try:
            # First byte is instruction discriminator
            if len(data) < 1:
                return {"valid": False, "error": "Empty data"}
            
            discriminator = data[0]
            payload = data[1:]
            
            # S-IO instruction types
            if discriminator == 0:  # Store data
                return self._validate_store_data(payload)
            elif discriminator == 1:  # Retrieve data
                return self._validate_retrieve_data(payload)
            else:
                return {"valid": False, "error": "Unknown instruction"}
                
        except Exception as e:
            return {"valid": False, "error": str(e)}
    
    def _validate_store_data(self, payload: bytes) -> Dict[str, Any]:
        """Validate store data instruction"""
        if len(payload) < 32:  # Minimum: data_hash (32 bytes)
            return {"valid": False, "error": "Invalid store data payload"}
        
        data_hash = payload[:32].hex()
        metadata = payload[32:] if len(payload) > 32 else b""
        
        return {
            "valid": True,
            "type": "store",
            "hash": data_hash,
            "metadata_size": len(metadata)
        }
    
    def _validate_retrieve_data(self, payload: bytes) -> Dict[str, Any]:
        """Validate retrieve data instruction"""
        if len(payload) != 32:  # Exact: data_hash (32 bytes)
            return {"valid": False, "error": "Invalid retrieve data payload"}
        
        data_hash = payload.hex()
        
        return {
            "valid": True,
            "type": "retrieve",
            "hash": data_hash
        }
    
    def process_data_transaction(self, transaction: Transaction) -> Dict[str, Any]:
        """Process validated S-IO data transaction"""
        validation = self.validate_data_transaction(transaction)
        if not validation["valid"]:
            return validation
        
        # Store transaction in cache
        tx_hash = str(transaction.signatures[0])
        self.rpc_cache.set(f"sio_tx:{tx_hash}", {
            "timestamp": int(time.time()),
            "validation": validation,
            "processed": True
        }, ttl=3600)
        
        return {"processed": True, "tx_hash": tx_hash}


class SIODataTransmitter:
    """Handle S-IO data transmission with validator integration"""
    
    def __init__(self, validator: SIOValidator, rpc_cache):
        self.validator = validator
        self.rpc_cache = rpc_cache
    
    def create_data_instruction(self, data_hash: str, metadata: bytes = b"") -> bytes:
        """Create S-IO store data instruction"""
        discriminator = bytes([0])  # Store data
        hash_bytes = bytes.fromhex(data_hash)
        return discriminator + hash_bytes + metadata
    
    def create_retrieve_instruction(self, data_hash: str) -> bytes:
        """Create S-IO retrieve data instruction"""
        discriminator = bytes([1])  # Retrieve data
        hash_bytes = bytes.fromhex(data_hash)
        return discriminator + hash_bytes
    
    def store_data(self, data: Any, payer: Pubkey) -> Dict[str, Any]:
        """Store data with S-IO validator"""
        # Hash data
        import hashlib
        data_json = json.dumps(data, sort_keys=True)
        data_hash = hashlib.sha256(data_json.encode()).hexdigest()
        
        # Store in cache
        self.rpc_cache.set(f"sio_data:{data_hash}", {
            "data": data,
            "stored_at": int(time.time()),
            "payer": str(payer)
        }, ttl=86400)  # 24 hours
        
        return {
            "success": True,
            "data_hash": data_hash,
            "instruction": self.create_data_instruction(data_hash).hex()
        }
    
    def retrieve_data(self, data_hash: str) -> Dict[str, Any]:
        """Retrieve data by hash"""
        cached_data = self.rpc_cache.get(f"sio_data:{data_hash}")
        if not cached_data:
            return {"success": False, "error": "Data not found"}
        
        return {
            "success": True,
            "data": cached_data["data"],
            "stored_at": cached_data["stored_at"],
            "payer": cached_data["payer"]
        }


# S-IO Program Constants
SIO_PROGRAM_ID = "SioProgram1234567890123456789012345678901"
SIO_DATA_SEED = b"sio_data"
SIO_INSTRUCTION_STORE = 0
SIO_INSTRUCTION_RETRIEVE = 1