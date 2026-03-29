from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
import time
import json

router = APIRouter(prefix="/api/sio", tags=["sio-payments"])

# S-IO Token Contract Address
SIO_TOKEN_ADDRESS = "Fuj6EDWQHBnQ3eEvYDujNQ4rPLSkhm3pBySbQ79Bpump"

class PaymentRequest(BaseModel):
    wallet_address: str
    amount: float
    service: str
    description: str

class Transaction(BaseModel):
    id: str
    wallet_address: str
    amount: float
    service: str
    description: str
    status: str
    timestamp: int
    signature: Optional[str] = None

class PaymentResponse(BaseModel):
    payment_id: str
    amount: float
    recipient: str
    status: str
    message: str

# In-memory storage (replace with database in production)
transactions_db = {}
user_transactions = {}

@router.post("/pay", response_model=PaymentResponse)
async def process_payment(payment: PaymentRequest):
    """Process S-IO payment for services"""
    try:
        payment_id = f"sio_{int(time.time() * 1000)}"
        
        # Create transaction record
        transaction = Transaction(
            id=payment_id,
            wallet_address=payment.wallet_address,
            amount=payment.amount,
            service=payment.service,
            description=payment.description,
            status="pending",
            timestamp=int(time.time() * 1000)
        )
        
        # Store transaction
        transactions_db[payment_id] = transaction
        
        if payment.wallet_address not in user_transactions:
            user_transactions[payment.wallet_address] = []
        user_transactions[payment.wallet_address].append(transaction)
        
        return PaymentResponse(
            payment_id=payment_id,
            amount=payment.amount,
            recipient=SIO_TOKEN_ADDRESS,
            status="pending",
            message=f"Payment initiated for {payment.service}"
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/confirm/{payment_id}")
async def confirm_payment(payment_id: str, signature: str):
    """Confirm S-IO payment with transaction signature"""
    try:
        if payment_id not in transactions_db:
            raise HTTPException(status_code=404, detail="Payment not found")
        
        transaction = transactions_db[payment_id]
        transaction.status = "confirmed"
        transaction.signature = signature
        
        return {"status": "confirmed", "payment_id": payment_id, "signature": signature}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/transactions/{wallet_address}", response_model=List[Transaction])
async def get_transactions(wallet_address: str):
    """Get S-IO transaction history for wallet"""
    try:
        if wallet_address not in user_transactions:
            return []
        
        # Sort by timestamp (newest first)
        transactions = sorted(
            user_transactions[wallet_address],
            key=lambda x: x.timestamp,
            reverse=True
        )
        
        return transactions
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/balance/{wallet_address}")
async def get_sio_balance(wallet_address: str):
    """Get S-IO token balance (mock implementation)"""
    try:
        # Mock balance - replace with actual Solana RPC call
        mock_balance = 1000.0
        
        return {
            "wallet_address": wallet_address,
            "token_address": SIO_TOKEN_ADDRESS,
            "balance": mock_balance,
            "symbol": "S-IO",
            "decimals": 9
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/services")
async def get_services():
    """Get available S-IO paid services"""
    return {
        "services": [
            {
                "id": "neural_network_access",
                "name": "Neural Network Access",
                "description": "Access to AI neural network predictions",
                "price": 100000.0,
                "currency": "S-IO"
            },
            {
                "id": "premium_analytics",
                "name": "Premium Analytics",
                "description": "Advanced market analytics and insights",
                "price": 250000.0,
                "currency": "S-IO"
            },
            {
                "id": "ai_trading_signals",
                "name": "AI Trading Signals",
                "description": "Real-time AI-powered trading signals",
                "price": 500000.0,
                "currency": "S-IO"
            },
            {
                "id": "guardian_premium",
                "name": "Guardian Premium",
                "description": "Advanced security monitoring and alerts",
                "price": 150000.0,
                "currency": "S-IO"
            },
            {
                "id": "api_access_tier1",
                "name": "API Access - Basic",
                "description": "1,000 API calls per month",
                "price": 100000.0,
                "currency": "S-IO"
            },
            {
                "id": "api_access_tier2",
                "name": "API Access - Pro",
                "description": "10,000 API calls per month",
                "price": 750000.0,
                "currency": "S-IO"
            },
            {
                "id": "api_access_tier3",
                "name": "API Access - Enterprise",
                "description": "Unlimited API calls per month",
                "price": 2500000.0,
                "currency": "S-IO"
            },
            {
                "id": "ai_model_training",
                "name": "Custom AI Model Training",
                "description": "Train custom AI models on your data",
                "price": 1000000.0,
                "currency": "S-IO"
            },
            {
                "id": "enterprise_support",
                "name": "Enterprise Support",
                "description": "24/7 dedicated support and consulting",
                "price": 5000000.0,
                "currency": "S-IO"
            }
        ]
    }

@router.get("/payment/{payment_id}")
async def get_payment_status(payment_id: str):
    """Get payment status"""
    try:
        if payment_id not in transactions_db:
            raise HTTPException(status_code=404, detail="Payment not found")
        
        transaction = transactions_db[payment_id]
        return {
            "payment_id": payment_id,
            "status": transaction.status,
            "amount": transaction.amount,
            "service": transaction.service,
            "timestamp": transaction.timestamp,
            "signature": transaction.signature
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))