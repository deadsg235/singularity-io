from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def read_root():
    return {"Hello": "World"}

@app.get("/api/nodes")
def get_nodes():
    return {"node_count": 16000000}
