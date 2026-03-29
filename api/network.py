from http.server import BaseHTTPRequestHandler
import json
import random

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
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
        
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps({
            "nodes": nodes,
            "connections": connections,
            "layers": layers
        }).encode())
