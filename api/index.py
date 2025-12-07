from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from mangum import Mangum

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
@app.get("/api")
def read_root():
    return {"name": "Singularity.io", "version": "0.2.0", "status": "online"}

@app.get("/api/health")
def health():
    return {"status": "healthy"}

@app.get("/api/network/stats")
def network_stats():
    return {"solana_network": "mainnet-beta", "status": "initializing"}

@app.get("/api/solfunmeme/status")
def solfunmeme():
    return {"technology": "SolFunMeme", "status": "development"}

@app.get("/api/economy/overview")
def economy():
    return {"token": "SFM", "status": "pre-launch"}

@app.get("/api/neural/network")
def neural_network():
    return {
        "nodes": [
            {"id": i, "layer": i // 12, "value": 0.5, "x": (i % 8) / 8, "y": (i // 12) / 3}
            for i in range(48)
        ],
        "connections": [
            {"source": i, "target": i + 8, "weight": 0.5}
            for i in range(40)
        ],
        "layers": [8, 16, 16, 8]
    }

@app.post("/api/neural/update")
def update_neural():
    return {"status": "updated"}

handler = Mangum(app, lifespan="off")
