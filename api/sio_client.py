"""S-IO Protocol Client for payment creation and transaction handling"""
import json
import time
import base64
from typing import Dict, Any, Optional
from solders.pubkey import Pubkey
from solders.keypair import Keypair
from solders.transaction import Transaction
from solders.system_program import transfer, TransferParams
from solders.message import Message
from .sio_protocol import (
    SIOPaymentRequirements,
    SIOPaymentPayload,
    encode_sio_payment
)


class SIOClient:
    """Client for creating and signing SIO payments"""
    
    def __init__(self, rpc_url: str = "https://api.mainnet-beta.solana.com"):
        self.rpc_url = rpc_url
    
    def create_payment(
        self,
        requirements: SIOPaymentRequirements,
        payer_keypair: Keypair
    ) -> str:
        """Create a signed payment for the given requirements"""
        try:
            # Create transfer instruction
            transfer_ix = transfer(
                TransferParams(
                    from_pubkey=payer_keypair.pubkey(),
                    to_pubkey=Pubkey.from_string(requirements.recipient),
                    lamports=int(requirements.amount)
                )
            )
            
            # Create transaction
            message = Message.new_with_blockhash(
                [transfer_ix],
                payer_keypair.pubkey(),
                # In production, get recent blockhash from RPC
                Pubkey.default()  # Placeholder
            )
            
            transaction = Transaction.new_unsigned(message)
            transaction.sign([payer_keypair], message.recent_blockhash)
            
            # Create payment payload
            payload = SIOPaymentPayload(
                signature=str(transaction.signatures[0]),
                transaction=base64.b64encode(bytes(transaction)).decode(),
                payer=str(payer_keypair.pubkey())
            )
            
            return encode_sio_payment(payload)
            
        except Exception as e:
            raise Exception(f"Failed to create payment: {str(e)}")
    
    def estimate_fee(self, requirements: SIOPaymentRequirements) -> int:
        """Estimate transaction fee for the payment"""
        # Simplified fee estimation
        return 5000  # 0.000005 SOL base fee
    
    def validate_requirements(self, requirements: SIOPaymentRequirements) -> bool:
        """Validate payment requirements"""
        try:
            # Check amount is valid
            int(requirements.amount)
            
            # Check recipient is valid pubkey
            Pubkey.from_string(requirements.recipient)
            
            # Check token mint is valid pubkey
            Pubkey.from_string(requirements.token)
            
            return True
        except:
            return False


class SIOWalletAdapter:
    """Wallet adapter for browser-based SIO payments"""
    
    @staticmethod
    def create_payment_request(requirements: SIOPaymentRequirements) -> Dict[str, Any]:
        """Create payment request for browser wallet"""
        return {
            "protocol": "s-io",
            "version": 1,
            "requirements": requirements.model_dump(),
            "instructions": [
                {
                    "type": "spl-token-transfer",
                    "params": {
                        "mint": requirements.token,
                        "amount": requirements.amount,
                        "recipient": requirements.recipient
                    }
                }
            ]
        }
    
    @staticmethod
    def parse_wallet_response(response: Dict[str, Any]) -> SIOPaymentPayload:
        """Parse wallet response into payment payload"""
        return SIOPaymentPayload(
            signature=response["signature"],
            transaction=response["transaction"],
            payer=response["payer"]
        )


# Utility functions
def create_sio_payment_header(
    requirements: SIOPaymentRequirements,
    payer_keypair: Keypair
) -> Dict[str, str]:
    """Create HTTP headers with SIO payment"""
    client = SIOClient()
    payment = client.create_payment(requirements, payer_keypair)
    
    return {
        "X-SIO-PAYMENT": payment,
        "Content-Type": "application/json"
    }


def parse_sio_settlement_response(headers: Dict[str, str]) -> Optional[Dict[str, Any]]:
    """Parse SIO settlement response from headers"""
    settlement_header = headers.get("X-SIO-SETTLEMENT")
    if not settlement_header:
        return None
    
    try:
        settlement_data = base64.b64decode(settlement_header.encode()).decode()
        return json.loads(settlement_data)
    except:
        return None