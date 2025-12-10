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
    import requests
    from fastapi import HTTPException
    
    try:
        # Get SOL balance
        rpc_data = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "getBalance",
            "params": [wallet]
        }
        response = requests.post("https://api.mainnet-beta.solana.com", json=rpc_data, timeout=5)
        
        if response.status_code != 200:
            raise HTTPException(500, f"RPC Error {response.status_code}: {response.text}")
        
        result = response.json()
        if "error" in result:
            raise HTTPException(500, f"RPC Error: {result['error']}")
        
        sol_balance = result["result"]["value"] / 1e9
        
        # Get S-IO balance
        token_data = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "getTokenAccountsByOwner",
            "params": [
                wallet,
                {"mint": "Fuj6EDWQHBnQ3eEvYDujNQ4rPLSkhm3pBySbQ79Bpump"},
                {"encoding": "jsonParsed"}
            ]
        }
        token_response = requests.post("https://api.mainnet-beta.solana.com", json=token_data, timeout=5)
        
        sio_balance = 0
        if token_response.status_code == 200:
            token_result = token_response.json()
            if "result" in token_result and token_result["result"]["value"]:
                account_info = token_result["result"]["value"][0]["account"]["data"]["parsed"]["info"]
                sio_balance = float(account_info["tokenAmount"]["uiAmount"] or 0)
        
        return {
            "wallet": wallet,
            "sol_balance": sol_balance,
            "sio_balance": sio_balance,
            "total_tokens": 2
        }
        
    except Exception as e:
        raise HTTPException(500, str(e))

@app.get("/api/staking/user/{wallet}")
def get_user_staking(wallet: str):
    return {
        "total_staked": 0,
        "pending_rewards": 0,
        "stakes": {}
    }

handler = app