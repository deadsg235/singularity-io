from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
try:
    from sio_token import router as sio_router
except ImportError:
    sio_router = None
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

# Include S-IO token router if available
if sio_router:
    app.include_router(sio_router)



@app.get("/")
def root():
    return {"status": "Singularity.io API", "version": "1.0"}

@app.get("/api")
def api_root():
    return {"status": "API active", "endpoints": ["/api/wallet/analytics", "/api/groq/test"]}

@app.post("/api/groq/chat")
def groq_chat(data: dict):
    return {"response": "AI service temporarily unavailable"}

@app.post("/api/ultima/groq")
def ultima_groq(data: dict):
    return {"response": "ULTIMA service temporarily unavailable"}

@app.get("/api/wallet/analytics/{wallet}")
async def get_wallet_analytics(wallet: str):
    try:
        # Mock balance data for now
        return {
            "wallet": wallet,
            "sol_balance": 1.5,
            "sio_balance": 1000.0,
            "total_tokens": 2
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

# Vercel handler
def handler(request):
    return app(request)

# For local development
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)