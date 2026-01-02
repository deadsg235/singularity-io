from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Dict, List, Optional
import asyncio
import json
from datetime import datetime, timedelta
from solfunmeme_rpc import rpc_client

router = APIRouter(prefix="/api/sio", tags=["S-IO Protocol"])

# S-IO Token Contract
SIO_TOKEN_ADDRESS = "Fuj6EDWQHBnQ3eEvYDujNQ4rPLSkhm3pBySbQ79Bpump"

class SIOBalance(BaseModel):
    wallet: str
    balance: float
    locked: float
    available: float

class SIOTransaction(BaseModel):
    tx_hash: str
    from_wallet: str
    to_wallet: str
    amount: float
    service: str
    timestamp: datetime
    status: str

class ServiceUnlock(BaseModel):
    service_id: str
    wallet: str
    amount: float
    duration_days: int

# Storage for transactions and unlocked services
transactions: List[SIOTransaction] = []
unlocked_services: Dict[str, Dict] = {}

@router.get("/balance/{wallet}")
async def get_balance(wallet: str):
    """Get real S-IO balance via SolFunMeme RPC"""
    wallet_info = await rpc_client.get_wallet_info(wallet)
    return SIOBalance(
        wallet=wallet,
        balance=wallet_info["sio_balance"],
        locked=wallet_info["locked"],
        available=wallet_info["available"]
    )

@router.post("/transfer")
async def transfer_sio(transfer_data: dict):
    from_wallet = transfer_data.get("from_wallet")
    to_wallet = transfer_data.get("to_wallet")
    amount = transfer_data.get("amount")
    service = transfer_data.get("service")
    
    # Verify balance via SolFunMeme RPC
    wallet_info = await rpc_client.get_wallet_info(from_wallet)
    if wallet_info["sio_balance"] < amount:
        raise HTTPException(400, "Insufficient available balance")
    
    # Create transaction record
    tx = SIOTransaction(
        tx_hash=f"sio_{len(transactions)}_{int(datetime.now().timestamp())}",
        from_wallet=from_wallet,
        to_wallet=to_wallet,
        amount=amount,
        service=service,
        timestamp=datetime.now(),
        status="confirmed"
    )
    transactions.append(tx)
    
    return {"tx_hash": tx.tx_hash, "status": "confirmed"}

@router.post("/unlock-service")
async def unlock_service(unlock: ServiceUnlock):
    # Verify balance via SolFunMeme RPC
    wallet_info = await rpc_client.get_wallet_info(unlock.wallet)
    if wallet_info["sio_balance"] < unlock.amount:
        raise HTTPException(400, "Insufficient S-IO balance")
    
    # Use SolFunMeme RPC to unlock feature
    unlock_result = await rpc_client.unlock_feature({
        "wallet": unlock.wallet,
        "feature_id": unlock.service_id,
        "amount": unlock.amount
    })
    
    if not unlock_result["success"]:
        raise HTTPException(400, "Feature unlock failed")
    
    # Store unlocked service
    expiry = datetime.now() + timedelta(days=unlock.duration_days)
    unlocked_services[f"{unlock.wallet}_{unlock.service_id}"] = {
        "wallet": unlock.wallet,
        "service_id": unlock.service_id,
        "unlocked_at": datetime.now(),
        "expires_at": expiry,
        "tx_hash": unlock_result["tx_signature"]
    }
    
    return {
        "service_unlocked": True,
        "expires_at": expiry,
        "tx_hash": unlock_result["tx_signature"]
    }

@router.get("/services/{wallet}")
async def get_unlocked_services(wallet: str):
    user_services = {}
    for key, service in unlocked_services.items():
        if service["wallet"] == wallet and service["expires_at"] > datetime.now():
            user_services[service["service_id"]] = service
    return user_services

@router.get("/transactions/{wallet}")
async def get_transactions(wallet: str):
    return [tx for tx in transactions if tx.from_wallet == wallet or tx.to_wallet == wallet]

@router.get("/stats")
async def get_sio_stats():
    """Get S-IO system statistics"""
    return {
        "token_address": SIO_TOKEN_ADDRESS,
        "total_transactions": len(transactions),
        "total_unlocked_services": len(unlocked_services),
        "rpc_endpoint": "SolFunMeme Introspector"
    }