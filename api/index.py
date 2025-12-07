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
    import random
    layers = [8, 16, 16, 8]
    nodes = []
    connections = []
    node_id = 0
    
    for layer_idx, layer_size in enumerate(layers):
        for i in range(layer_size):
            nodes.append({
                "id": node_id,
                "layer": layer_idx,
                "value": round(random.random(), 3),
                "x": round(random.random(), 3),
                "y": round(layer_idx / (len(layers) - 1), 3)
            })
            node_id += 1
    
    layer_start = 0
    for layer_idx in range(len(layers) - 1):
        layer_size = layers[layer_idx]
        next_layer_size = layers[layer_idx + 1]
        next_layer_start = layer_start + layer_size
        
        for i in range(layer_size):
            for j in range(next_layer_size):
                connections.append({
                    "source": layer_start + i,
                    "target": next_layer_start + j,
                    "weight": round(random.uniform(-1, 1), 3)
                })
        
        layer_start = next_layer_start
    
    return {"nodes": nodes, "connections": connections, "layers": layers}

@app.post("/api/neural/update")
def update_neural():
    return {"status": "updated"}

handler = Mangum(app, lifespan="off")
