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
        
        strategy = data.get('strategy', 'dca')
        base_token = data.get('base_token', '')
        quote_token = data.get('quote_token', '')
        amount = data.get('amount', 0.1)
        
        api_key = os.environ.get('GROQ_API_KEY', '')
        
        if not api_key:
            response = {"decision": "HOLD", "reason": "AI not configured"}
        else:
            try:
                prompt = f"""Analyze trading opportunity:
Strategy: {strategy}
Pair: {base_token}/{quote_token}
Amount: {amount} SOL

Provide trading decision as JSON:
{{"action": "BUY|SELL|HOLD", "confidence": 0-100, "reason": "brief explanation"}}"""
                
                req_data = json.dumps({
                    "model": "llama-3.3-70b-versatile",
                    "messages": [
                        {"role": "system", "content": "You are a trading analyst. Respond only with valid JSON."},
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": 0.3,
                    "max_tokens": 150
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
                    content = result['choices'][0]['message']['content']
                    
                    try:
                        decision = json.loads(content)
                        response = decision
                    except:
                        response = {"action": "HOLD", "confidence": 0, "reason": "Parse error"}
                        
            except Exception as e:
                response = {"action": "HOLD", "confidence": 0, "reason": str(e)[:50]}
        
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
