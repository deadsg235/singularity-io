from http.server import BaseHTTPRequestHandler
import json
import os
import urllib.request
import urllib.error

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        content_length = int(self.headers['Content-Length'])
        body = self.rfile.read(content_length)
        data = json.loads(body.decode())
        
        message = data.get('message', '')
        wallet = data.get('wallet')
        
        api_key = os.environ.get('GROQ_API_KEY', '')
        
        if not api_key:
            response = "Chat AI not configured. Add GROQ_API_KEY in Vercel settings."
        else:
            try:
                system_prompt = f"You are an AI for Singularity.io, a Solana blockchain platform. User wallet: {wallet if wallet else 'Not connected'}. Deep Q-Network: 48 nodes (8→16→16→8). Network: Solana mainnet-beta. Be concise."
                
                tools = [{
                    "type": "function",
                    "function": {
                        "name": "create_token",
                        "description": "Create a new SPL token on Solana",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "name": {"type": "string", "description": "Token name"},
                                "symbol": {"type": "string", "description": "Token symbol (3-5 chars)"},
                                "decimals": {"type": "integer", "description": "Decimals (0-9)", "default": 9},
                                "supply": {"type": "integer", "description": "Initial supply"},
                                "description": {"type": "string", "description": "Token description"}
                            },
                            "required": ["name", "symbol", "supply"]
                        }
                    }
                }]
                
                req_data = json.dumps({
                    "model": "llama-3.3-70b-versatile",
                    "messages": [
                        {"role": "system", "content": system_prompt + " You can create tokens using the create_token function. Ask users for token details if they want to create one."},
                        {"role": "user", "content": message}
                    ],
                    "tools": tools,
                    "tool_choice": "auto",
                    "temperature": 0.7,
                    "max_tokens": 300
                }).encode()
                
                req = urllib.request.Request(
                    'https://api.groq.com/openai/v1/chat/completions',
                    data=req_data,
                    headers={
                        'Authorization': f'Bearer {api_key}',
                        'Content-Type': 'application/json'
                    }
                )
                
                with urllib.request.urlopen(req, timeout=10) as resp:
                    result = json.loads(resp.read().decode())
                    msg = result['choices'][0]['message']
                    
                    if msg.get('tool_calls'):
                        tool_call = msg['tool_calls'][0]
                        func_name = tool_call['function']['name']
                        args = json.loads(tool_call['function']['arguments'])
                        
                        if func_name == 'create_token':
                            response = json.dumps({
                                "action": "create_token",
                                "params": args,
                                "message": f"Creating token {args['name']} ({args['symbol']})..."
                            })
                        else:
                            response = msg.get('content', 'Tool call received')
                    else:
                        response = msg.get('content', 'No response')
            except urllib.error.HTTPError as e:
                response = f"API Error {e.code}. Check GROQ_API_KEY."
            except Exception as e:
                response = f"Error: {str(e)[:80]}"
        
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        self.wfile.write(json.dumps({"response": response}).encode())
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
