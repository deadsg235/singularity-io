from http.server import BaseHTTPRequestHandler
import json
import os

try:
    from langchain_groq import ChatGroq
    from langchain.schema import HumanMessage, SystemMessage
    GROQ_AVAILABLE = True
except:
    GROQ_AVAILABLE = False

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        content_length = int(self.headers['Content-Length'])
        body = self.rfile.read(content_length)
        data = json.loads(body.decode())
        
        message = data.get('message', '')
        wallet = data.get('wallet')
        
        if GROQ_AVAILABLE:
            try:
                llm = ChatGroq(
                    model="llama-3.3-70b-versatile",
                    api_key=os.environ.get('GROQ_API_KEY', 'gsk_demo_key'),
                    temperature=0.7
                )
                
                system_prompt = f"""You are an AI assistant for Singularity.io, a Solana blockchain platform.
                Context: User's wallet: {wallet if wallet else 'Not connected'}
                Platform: Deep Q-Network with 48 nodes (8→16→16→8 layers)
                Network: Solana mainnet-beta
                Keep responses concise and helpful."""
                
                messages = [
                    SystemMessage(content=system_prompt),
                    HumanMessage(content=message)
                ]
                
                result = llm.invoke(messages)
                response = result.content
            except Exception as e:
                response = f"AI temporarily unavailable. Error: {str(e)[:50]}"
        else:
            msg_lower = message.lower()
            if 'wallet' in msg_lower:
                response = f"Wallet: {wallet[:4]}...{wallet[-4:]}" if wallet else "No wallet connected"
            elif 'network' in msg_lower:
                response = "Connected to Solana mainnet-beta"
            elif 'neural' in msg_lower:
                response = "Deep Q-Network: 48 nodes, 4 layers (8→16→16→8)"
            else:
                response = "Try: 'wallet', 'network', or 'neural network'"
        
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
