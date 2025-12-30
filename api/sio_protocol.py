from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Dict, List, Optional
import asyncio
import json
from datetime import datetime, timedelta

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

# Mock storage with test data
balances: Dict[str, SIOBalance] = {
    "HxpisaTe3e2fgZcfvpTAwRo2QGDxzHpSZDr6j15Jt5Qp": SIOBalance(
        wallet="HxpisaTe3e2fgZcfvpTAwRo2QGDxzHpSZDr6j15Jt5Qp",
        balance=5000000.0,
        locked=0.0,
        available=5000000.0
    )
}
transactions: List[SIOTransaction] = []
unlocked_services: Dict[str, Dict] = {}

@router.get("/balance/{wallet}")
async def get_balance(wallet: str):
    if wallet not in balances:
        # Initialize new wallet with default balance
        balances[wallet] = SIOBalance(
            wallet=wallet,
            balance=1000000.0,  # 1M S-IO default
            locked=0.0,
            available=1000000.0
        )
    return balances[wallet]

@router.post("/transfer")
async def transfer_sio(transfer_data: dict):
    from_wallet = transfer_data.get("from_wallet")
    to_wallet = transfer_data.get("to_wallet")
    amount = transfer_data.get("amount")
    service = transfer_data.get("service")
    
    if from_wallet not in balances:
        await get_balance(from_wallet)
    
    balance = balances[from_wallet]
    if balance.available < amount:
        raise HTTPException(400, "Insufficient available balance")
    
    # Process transfer
    balance.available -= amount
    balance.locked += amount
    
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
    balance = await get_balance(unlock.wallet)
    if balance.available < unlock.amount:
        raise HTTPException(400, "Insufficient S-IO balance")
    
    # Process payment
    transfer_data = {
        "from_wallet": unlock.wallet,
        "to_wallet": "singularity_treasury",
        "amount": unlock.amount,
        "service": unlock.service_id
    }
    tx_result = await transfer_sio(transfer_data)
    
    # Unlock service
    expiry = datetime.now() + timedelta(days=unlock.duration_days)
    unlocked_services[f"{unlock.wallet}_{unlock.service_id}"] = {
        "wallet": unlock.wallet,
        "service_id": unlock.service_id,
        "unlocked_at": datetime.now(),
        "expires_at": expiry,
        "tx_hash": tx_result["tx_hash"]
    }
    
    return {
        "service_unlocked": True,
        "expires_at": expiry,
        "tx_hash": tx_result["tx_hash"]
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