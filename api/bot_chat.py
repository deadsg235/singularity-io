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
        bot_active = data.get('bot_active', False)
        stats = data.get('stats', {})
        
        api_key = os.environ.get('GROQ_API_KEY', '')
        
        if not api_key:
            response = {"response": "AI not configured. Add GROQ_API_KEY."}
        else:
            try:
                system_prompt = f"""You are a trading bot assistant for Singularity.io.
Wallet: {wallet or 'Not connected'}
Bot Status: {'Active' if bot_active else 'Inactive'}
Stats: {stats.get('total', 0)} trades, PnL: {stats.get('pnl', 0)} SOL

You can execute trades and control the bot using these tools."""
                
                tools = [
                    {
                        "type": "function",
                        "function": {
                            "name": "execute_trade",
                            "description": "Execute a single trade swap",
                            "parameters": {
                                "type": "object",
                                "properties": {
                                    "from_token": {"type": "string", "description": "Source token mint"},
                                    "to_token": {"type": "string", "description": "Destination token mint"},
                                    "amount": {"type": "number", "description": "Amount to trade"}
                                },
                                "required": ["from_token", "to_token", "amount"]
                            }
                        }
                    },
                    {
                        "type": "function",
                        "function": {
                            "name": "start_bot",
                            "description": "Start automated trading bot",
                            "parameters": {
                                "type": "object",
                                "properties": {
                                    "strategy": {"type": "string", "enum": ["dca", "momentum", "arbitrage", "grid"]},
                                    "base_token": {"type": "string"},
                                    "quote_token": {"type": "string"},
                                    "amount": {"type": "number"}
                                },
                                "required": ["strategy", "base_token", "quote_token"]
                            }
                        }
                    },
                    {
                        "type": "function",
                        "function": {
                            "name": "stop_bot",
                            "description": "Stop the trading bot"
                        }
                    },
                    {
                        "type": "function",
                        "function": {
                            "name": "get_price",
                            "description": "Get current price for a token pair",
                            "parameters": {
                                "type": "object",
                                "properties": {
                                    "base_token": {"type": "string"},
                                    "quote_token": {"type": "string"}
                                },
                                "required": ["base_token", "quote_token"]
                            }
                        }
                    },
                    {
                        "type": "function",
                        "function": {
                            "name": "get_wallet_balance",
                            "description": "Get SOL balance of connected wallet"
                        }
                    }
                ]
                
                req_data = json.dumps({
                    "model": "llama-3.3-70b-versatile",
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": message}
                    ],
                    "tools": tools,
                    "tool_choice": "auto",
                    "temperature": 0.5,
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
                        
                        response = {
                            "action": func_name,
                            "params": args,
                            "message": f"Executing {func_name}..."
                        }
                    else:
                        response = {"response": msg.get('content', 'No response')}
                        
            except urllib.error.HTTPError as e:
                response = {"response": f"API Error {e.code}"}
            except Exception as e:
                response = {"response": f"Error: {str(e)[:80]}"}
        
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        self.wfile.write(json.dumps(response).encode())
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
