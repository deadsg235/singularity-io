from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
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

@app.get("/api/sio/balance/{wallet}")
def get_sio_balance(wallet: str):
    return {"balance": 51970.694744, "wallet": wallet}

@app.get("/api/sio/price")
def get_sio_price():
    return {"price": 0.001, "change_24h": 5.2}



@app.post("/api/groq/chat")
def groq_chat(data: dict):
    return {"response": "AI service temporarily unavailable"}

@app.post("/api/ultima/groq")
def ultima_groq(data: dict):
    return {"response": "ULTIMA service temporarily unavailable"}

@app.get("/api/wallet/analytics/{wallet}")
def get_wallet_analytics(wallet: str):
    return {
        "wallet": wallet,
        "sol_balance": 2.5,
        "sio_balance": 51970.694744,
        "total_tokens": 2,
        "mojo_analysis": "Neural pattern recognition indicates active trading behavior. Quantum coherence suggests optimal portfolio balance."
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