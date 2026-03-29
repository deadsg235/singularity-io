import random
from typing import List, Dict

class NeuralNode:
    def __init__(self, node_id: int, layer: int):
        self.id = node_id
        self.layer = layer
        self.value = random.random()
        self.connections = []
        self.x = random.uniform(0, 1)
        self.y = layer * 0.25
    
    def update(self):
        self.value = max(0, min(1, self.value + random.uniform(-0.1, 0.1)))

class DeepQNetwork:
    def __init__(self, layers=[8, 16, 16, 8]):
        self.layers = layers
        self.nodes = []
        self.connections = []
        self._initialize()
    
    def _initialize(self):
        node_id = 0
        for layer_idx, layer_size in enumerate(self.layers):
            for _ in range(layer_size):
                self.nodes.append(NeuralNode(node_id, layer_idx))
                node_id += 1
        
        # Create connections between layers
        layer_start = 0
        for layer_idx in range(len(self.layers) - 1):
            layer_size = self.layers[layer_idx]
            next_layer_size = self.layers[layer_idx + 1]
            next_layer_start = layer_start + layer_size
            
            for i in range(layer_size):
                node = self.nodes[layer_start + i]
                for j in range(next_layer_size):
                    target_id = next_layer_start + j
                    node.connections.append(target_id)
                    self.connections.append({
                        "source": node.id,
                        "target": target_id,
                        "weight": random.uniform(-1, 1)
                    })
            
            layer_start = next_layer_start
    
    def get_state(self) -> Dict:
        return {
            "nodes": [
                {
                    "id": node.id,
                    "layer": node.layer,
                    "value": round(node.value, 3),
                    "x": round(node.x, 3),
                    "y": round(node.y, 3)
                }
                for node in self.nodes
            ],
            "connections": self.connections,
            "layers": self.layers
        }
    
    def update(self):
        for node in self.nodes:
            node.update()

dqn = DeepQNetwork()
