from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import requests
import os

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



@app.post("/api/groq/chat")
def groq_chat(data: dict):
    try:
        import os
        import requests
        
        api_key = os.getenv('GROQ_API_KEY')
        if not api_key:
            return {"response": "API key not configured"}
        
        message = data.get("message", "")
        system = data.get("system", "You are ULTIMA, a helpful AI assistant.")
        
        if not message:
            return {"response": "No message provided"}
        
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": "llama3-8b-8192",
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": message}
            ],
            "temperature": 0.7,
            "max_tokens": 1024
        }
        
        response = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers=headers,
            json=payload,
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            return {"response": result["choices"][0]["message"]["content"]}
        else:
            return {"response": "Service temporarily unavailable"}
            
    except Exception as e:
        return {"response": "Processing error occurred"}

@app.post("/api/ultima/groq")
def ultima_groq(data: dict):
    try:
        message = data.get("message", "")
        wallet = data.get("wallet")
        
        if not message:
            return {"error": "No message provided"}
        
        # Use LangChain agent with tools
        from langchain_agent import process_with_langchain
        response = process_with_langchain(message, wallet)
        return {"response": response}
        
    except Exception as e:
        # Fallback to direct Groq if LangChain fails
        try:
            from groq_client import call_groq
            response = call_groq(message)
            return {"response": response}
        except:
            return {"error": f"All AI systems offline: {str(e)}"}

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