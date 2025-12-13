import random
import json
from typing import Dict, List, Any

class DeepQNetwork:
    def __init__(self):
        self.nodes = []
        self.connections = []
        self.layers = [
            {"id": 0, "name": "Input", "nodes": 4},
            {"id": 1, "name": "Hidden1", "nodes": 64},
            {"id": 2, "name": "Hidden2", "nodes": 32},
            {"id": 3, "name": "Output", "nodes": 2}
        ]
        self.initialize_network()
    
    def initialize_network(self):
        node_id = 0
        for layer_idx, layer in enumerate(self.layers):
            for i in range(layer["nodes"]):
                self.nodes.append({
                    "id": node_id,
                    "layer": layer_idx,
                    "activation": random.random(),
                    "x": layer_idx * 200,
                    "y": i * 50 + random.randint(-20, 20),
                    "z": random.randint(-50, 50)
                })
                node_id += 1
        
        # Create connections between layers
        for layer_idx in range(len(self.layers) - 1):
            current_layer_nodes = [n for n in self.nodes if n["layer"] == layer_idx]
            next_layer_nodes = [n for n in self.nodes if n["layer"] == layer_idx + 1]
            
            for current_node in current_layer_nodes:
                for next_node in next_layer_nodes:
                    self.connections.append({
                        "source": current_node["id"],
                        "target": next_node["id"],
                        "weight": random.uniform(-1, 1),
                        "active": random.random() > 0.3
                    })
    
    def update(self):
        # Simulate network activity
        for node in self.nodes:
            node["activation"] = max(0, node["activation"] + random.uniform(-0.1, 0.1))
        
        for connection in self.connections:
            connection["weight"] += random.uniform(-0.01, 0.01)
            connection["active"] = random.random() > 0.2
    
    def get_state(self):
        return {
            "nodes": self.nodes,
            "connections": self.connections,
            "layers": self.layers,
            "stats": {
                "total_nodes": len(self.nodes),
                "total_connections": len(self.connections),
                "active_connections": sum(1 for c in self.connections if c["active"])
            }
        }

dqn = DeepQNetwork()
