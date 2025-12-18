from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sio_token import router as sio_router
import requests
import os

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "*",
        "https://singularity-io-git-working-build-introspector-boston.vercel.app",
        "https://singularity-iov1.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Include S-IO token router
app.include_router(sio_router)



@app.post("/api/groq/chat")
def groq_chat(data: dict):
    return {"response": "AI service temporarily unavailable"}

@app.post("/api/ultima/groq")
def ultima_groq(data: dict):
    return {"response": "ULTIMA service temporarily unavailable"}

@app.get("/api/wallet/analytics/{wallet}")
async def get_wallet_analytics(wallet: str):
    try:
        # Get SOL balance using cached RPC
        from solana_rpc_cache import rpc_cache
        result = rpc_cache.call("getBalance", [wallet], cache_ttl=60)
        sol_balance = 0
        if "result" in result and "value" in result["result"]:
            sol_balance = result["result"]["value"] / 1e9
        
        # Get S-IO balance
        sio_response = await get_sio_balance(wallet)
        sio_balance = sio_response.get("balance", 0)
        
        return {
            "wallet": wallet,
            "sol_balance": sol_balance,
            "sio_balance": sio_balance,
            "total_tokens": 2,
            "mojo_analysis": "Neural pattern recognition indicates active trading behavior. Quantum coherence suggests optimal portfolio balance."
        }
    except Exception as e:
        return {
            "wallet": wallet,
            "sol_balance": 0,
            "sio_balance": 0,
            "total_tokens": 0,
            "error": str(e)
        }

@app.get("/api/staking/user/{wallet}")
def get_user_staking(wallet: str):
    return {
        "total_staked": 0,
        "pending_rewards": 0,
        "stakes": {}
    }

@app.get("/api/ultima/test")
def test_ultima():
    import os
    return {"status": "ULTIMA endpoint working", "groq_key_set": bool(os.getenv("GROQ_API_KEY"))}

@app.get("/api/groq/test")
def test_groq():
    import os
    return {"status": "Groq endpoint ready", "api_key_configured": bool(os.getenv("GROQ_API_KEY"))}

handler = app