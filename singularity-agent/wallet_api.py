"""
SIO Wallet API - FastAPI endpoints for wallet updates
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, List
import asyncio
import json
from wallet_updates import SIOWalletUpdater, get_wallet_balance_sync

router = APIRouter()

# WebSocket connections for real-time updates
active_connections: List[WebSocket] = []
wallet_updater = SIOWalletUpdater(update_interval=15)  # 15 second updates

@router.get("/api/wallet/sio-balance/{wallet_address}")
async def get_sio_balance(wallet_address: str):
    """Get current SIO balance"""
    from sio_balance import SIOBalanceClient
    client = SIOBalanceClient()
    return await client.get_sio_balance(wallet_address)

@router.websocket("/ws/wallet/{wallet_address}")
async def wallet_websocket(websocket: WebSocket, wallet_address: str):
    """WebSocket for real-time wallet updates"""
    await websocket.accept()
    active_connections.append(websocket)
    
    async def balance_callback(update_data: Dict):
        """Send balance update via WebSocket"""
        try:
            await websocket.send_text(json.dumps({
                "type": "balance_update",
                "data": update_data
            }))
        except:
            pass
    
    # Add wallet to monitoring
    wallet_updater.add_wallet(wallet_address, balance_callback)
    
    # Start monitoring if not running
    if not wallet_updater.running:
        asyncio.create_task(wallet_updater.start_monitoring())
    
    try:
        # Send initial balance
        from sio_balance import SIOBalanceClient
        client = SIOBalanceClient()
        initial_balance = await client.get_sio_balance(wallet_address)
        await websocket.send_text(json.dumps({
            "type": "initial_balance",
            "data": initial_balance
        }))
        
        # Keep connection alive
        while True:
            await websocket.receive_text()
            
    except WebSocketDisconnect:
        active_connections.remove(websocket)
        wallet_updater.remove_wallet(wallet_address)

@router.post("/api/wallet/monitor/{wallet_address}")
async def start_monitoring(wallet_address: str):
    """Start monitoring wallet"""
    wallet_updater.add_wallet(wallet_address)
    
    if not wallet_updater.running:
        asyncio.create_task(wallet_updater.start_monitoring())
    
    return {"status": "monitoring_started", "wallet": wallet_address}

@router.delete("/api/wallet/monitor/{wallet_address}")
async def stop_monitoring(wallet_address: str):
    """Stop monitoring wallet"""
    wallet_updater.remove_wallet(wallet_address)
    return {"status": "monitoring_stopped", "wallet": wallet_address}