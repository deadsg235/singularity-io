from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/sio/balance/{wallet}")
def get_sio_balance(wallet: str):
    return {"balance": 51970.694744, "wallet": wallet}

@app.get("/api/sio/price")
def get_sio_price():
    return {"price": 0.001, "change_24h": 5.2}

@app.get("/api/wallet/analytics/{wallet}")
def get_wallet_analytics(wallet: str):
    from rpc_client import get_sol_balance, get_sio_balance
    
    sol_result = get_sol_balance(wallet)
    sio_result = get_sio_balance(wallet)
    
    if "error" in sol_result:
        return {"error": f"SOL balance error: {sol_result['error']}"}
    
    if "error" in sio_result:
        return {"error": f"S-IO balance error: {sio_result['error']}"}
    
    return {
        "wallet": wallet,
        "sol_balance": sol_result["balance"],
        "sio_balance": sio_result["balance"],
        "total_tokens": 2
    }

@app.get("/api/staking/user/{wallet}")
def get_user_staking(wallet: str):
    return {
        "total_staked": 0,
        "pending_rewards": 0,
        "stakes": {}
    }

handler = app