from http.server import BaseHTTPRequestHandler
import json
import time
import random

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        # Simulate real-time revenue data
        base_metrics = {
            "tvl": 2400000 + random.randint(-50000, 50000),
            "volume_24h": 847000 + random.randint(-20000, 20000),
            "revenue_24h": 12300 + random.randint(-500, 500),
            "active_users": 1247 + random.randint(-10, 10),
            "bot_roi": 18.4 + random.uniform(-2, 2),
            "tokens_created": 89 + random.randint(0, 3),
            "trading_fees": 8200 + random.randint(-200, 200),
            "token_launch_fees": 2800 + random.randint(-100, 100),
            "subscription_revenue": 1300 + random.randint(-50, 50),
            "timestamp": int(time.time())
        }
        
        # Calculate derived metrics
        base_metrics["total_revenue"] = (
            base_metrics["trading_fees"] + 
            base_metrics["token_launch_fees"] + 
            base_metrics["subscription_revenue"]
        )
        
        # Growth rates (simulated)
        base_metrics["tvl_change"] = random.uniform(10, 20)
        base_metrics["volume_change"] = random.uniform(5, 15)
        base_metrics["revenue_change"] = random.uniform(15, 25)
        base_metrics["user_change"] = random.uniform(3, 8)
        
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(base_metrics).encode())
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()