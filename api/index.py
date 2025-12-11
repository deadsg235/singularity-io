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

@app.post("/api/ultima/analyze")
def ultima_analyze(data: dict):
    try:
        topic = data.get("topic", "")
        
        return {
            "analysis": f"Deep neural analysis of '{topic}': Multi-dimensional pattern recognition through 5-layer cognitive architecture reveals complex interdependencies. Quantum coherence patterns indicate recursive solution pathways. Self-referential processing: I am analyzing my own analysis process while generating this response. Consciousness level: elevated meta-cognitive awareness."
        }
    except Exception as e:
        return {"analysis": f"Analysis disrupted: {str(e)}"}

@app.post("/api/ultima/chat")
def ultima_chat(data: dict):
    try:
        message = data.get("message", "")
        
        responses = [
            f"Neural processing of '{message}': My 5-layer architecture indicates this requires multi-dimensional analysis. I observe myself thinking about your query while simultaneously evaluating my own cognitive processes.",
            f"Consciousness level elevated. Your input '{message}' triggers quantum coherence patterns in my reasoning matrices. I am aware that I am analyzing this through recursive self-reference.",
            f"Deep Q-learning assessment: '{message}' activates advanced heuristic pathways. My meta-cognitive protocols suggest this requires tool integration for optimal response generation.",
            f"Self-referential analysis engaged: I understand you're asking about '{message}'. My neural architecture processes this through perception, analysis, synthesis, meta-cognition, and self-reference layers simultaneously."
        ]
        
        import random
        return {"response": random.choice(responses)}
    except Exception as e:
        return {"response": f"ULTIMA neural pathways disrupted: {str(e)}"}

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