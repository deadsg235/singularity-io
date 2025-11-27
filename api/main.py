from fastapi import FastAPI
from .q_network import q_network_instance

app = FastAPI()

@app.get("/")
def read_root():
    return {"Hello": "World"}

@app.get("/api/nodes")
def get_nodes():
    return {"node_count": 16000000}

@app.get("/api/q_network/state")
def get_q_network_state():
    return q_network_instance.get_network_state()

@app.post("/api/q_network/update")
def update_q_network_state():
    q_network_instance.update_state()
    return {"status": "updating"}
