from http.server import BaseHTTPRequestHandler
import json
import time

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        # S-IO Token metrics
        tokenomics_data = {
            "token_name": "S-IO",
            "total_supply": 100000000,
            "circulating_supply": 25000000,
            "staked_amount": 18500000,
            "staking_apy": 24.5,
            "governance_proposals": 3,
            "revenue_share_percentage": 15,
            "current_price": 0.85,
            "market_cap": 21250000,
            "holders": 12847,
            "daily_volume": 2400000,
            "treasury_balance": 5200000,
            "burn_rate": 0.1,
            "utility_features": [
                "Governance Voting",
                "Revenue Sharing", 
                "Staking Rewards",
                "Premium Features Access",
                "Trading Fee Discounts",
                "Exclusive Airdrops"
            ],
            "distribution": {
                "public_sale": 40,
                "team": 20,
                "treasury": 15,
                "ecosystem": 15,
                "advisors": 5,
                "liquidity": 5
            },
            "vesting_schedule": {
                "team": "24 months linear",
                "advisors": "12 months linear", 
                "treasury": "No lock",
                "ecosystem": "6 months cliff, 18 months linear"
            },
            "timestamp": int(time.time())
        }
        
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(tokenomics_data).encode())
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()