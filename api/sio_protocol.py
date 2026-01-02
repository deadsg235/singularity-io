from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Dict, List, Optional
import asyncio
import json
from datetime import datetime, timedelta
from sio_token import get_sio_balance, get_sio_stats

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
    """Get real S-IO balance via cached RPC"""
    balance_data = await get_sio_balance(wallet)
    return SIOBalance(
        wallet=wallet,
        balance=balance_data["balance"],
        locked=0.0,
        available=balance_data["balance"]
    )

@router.post("/transfer")
async def transfer_sio(transfer_data: dict):
    from_wallet = transfer_data.get("from_wallet")
    amount = transfer_data.get("amount")
    
    # Verify balance via cached RPC
    balance_data = await get_sio_balance(from_wallet)
    if balance_data["balance"] < amount:
        raise HTTPException(400, "Insufficient available balance")
    
    # Create transaction record
    tx = SIOTransaction(
        tx_hash=f"sio_{len(transactions)}_{int(datetime.now().timestamp())}",
        from_wallet=from_wallet,
        to_wallet=transfer_data.get("to_wallet"),
        amount=amount,
        service=transfer_data.get("service"),
        timestamp=datetime.now(),
        status="confirmed"
    )
    transactions.append(tx)
    
    return {"tx_hash": tx.tx_hash, "status": "confirmed"}

@router.post("/unlock-service")
async def unlock_service(unlock: ServiceUnlock):
    # Verify balance via cached RPC
    balance_data = await get_sio_balance(unlock.wallet)
    if balance_data["balance"] < unlock.amount:
        raise HTTPException(400, "Insufficient S-IO balance")
    
    # Store unlocked service
    expiry = datetime.now() + timedelta(days=unlock.duration_days)
    tx_hash = f"unlock_{unlock.wallet[:8]}_{unlock.service_id}_{int(datetime.now().timestamp())}"
    
    unlocked_services[f"{unlock.wallet}_{unlock.service_id}"] = {
        "wallet": unlock.wallet,
        "service_id": unlock.service_id,
        "unlocked_at": datetime.now(),
        "expires_at": expiry,
        "tx_hash": tx_hash
    }
    
    return {
        "service_unlocked": True,
        "expires_at": expiry,
        "tx_hash": tx_hash
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
    stats_data = await get_sio_stats()
    return {
        "token_address": SIO_TOKEN_ADDRESS,
        "total_transactions": len(transactions),
        "total_unlocked_services": len(unlocked_services),
        "total_supply": stats_data.get("total_supply", 0),
        "price_usd": stats_data.get("price_usd", 0)
    }