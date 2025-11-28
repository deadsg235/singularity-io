from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import q_network # Changed from 'from q_network import q_network_instance'

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

@app.get("/")
def read_root():
    return {"Hello": "World"}

@app.get("/api/nodes")
def get_nodes():
    return {"node_count": 16000000}

@app.get("/api/q_network/state")
def get_q_network_state():
    return q_network.q_network_instance.get_network_state() # Updated reference

@app.post("/api/q_network/update")
def update_q_network_state():
    q_network.q_network_instance.update_state() # Updated reference
    return {"status": "updating"}

@app.post("/api/q_network/perturb/{node_id}")
def perturb_node(node_id: int):
    q_network.q_network_instance.perturb_node(node_id) # Updated reference
    return {"status": f"perturbed node {node_id}"}

@app.get("/api/game/state")
def get_game_state():
    return q_network.q_network_instance.game_state # Updated reference

@app.post("/api/game/reset")
def reset_game():
    q_network.q_network_instance.reset_game() # Updated reference
    return {"status": "game reset"}
