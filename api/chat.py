from http.server import BaseHTTPRequestHandler
import json

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        content_length = int(self.headers['Content-Length'])
        body = self.rfile.read(content_length)
        data = json.loads(body.decode())
        
        message = data.get('message', '').lower()
        wallet = data.get('wallet')
        
        if 'wallet' in message:
            if wallet:
                response = f"Your wallet {wallet[:4]}...{wallet[-4:]} is connected to Solana mainnet-beta."
            else:
                response = "No wallet connected. Click 'Connect Wallet' to connect your Phantom wallet."
        elif 'balance' in message:
            response = "Wallet balance checking requires Solana RPC integration. Coming soon!"
        elif 'network' in message:
            response = "Connected to Solana mainnet-beta. The network is operational."
        elif 'neural' in message or 'ai' in message:
            response = "The Deep Q-Network has 48 nodes across 4 layers (8→16→16→8). It's visualized above!"
        elif 'help' in message:
            response = "I can help with: wallet info, network status, neural network details, and Solana questions."
        else:
            response = f"You said: '{data.get('message')}'. Try asking about your wallet, network, or neural network!"
        
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps({"response": response}).encode())
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
