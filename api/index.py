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
    try:
        import requests
        
        rpc_data = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "getBalance",
            "params": [wallet]
        }
        
        response = requests.post("https://api.mainnet-beta.solana.com", json=rpc_data, timeout=10)
        result = response.json()
        
        if "error" in result:
            return {"error": f"RPC Error: {result['error']}"}
        
        sol_balance = result["result"]["value"] / 1e9
        
        return {
            "wallet": wallet,
            "sol_balance": sol_balance,
            "sio_balance": 51970.694744,
            "total_tokens": 2
        }
        
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/staking/user/{wallet}")
def get_user_staking(wallet: str):
    return {
        "total_staked": 0,
        "pending_rewards": 0,
        "stakes": {}
    }

handler = app