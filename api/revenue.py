from fastapi import APIRouter
import time
import random

router = APIRouter()

@router.get("/api/revenue/metrics")
def get_revenue_metrics():
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
    
    base_metrics["total_revenue"] = (
        base_metrics["trading_fees"] + 
        base_metrics["token_launch_fees"] + 
        base_metrics["subscription_revenue"]
    )
    
    base_metrics["tvl_change"] = random.uniform(10, 20)
    base_metrics["volume_change"] = random.uniform(5, 15)
    base_metrics["revenue_change"] = random.uniform(15, 25)
    base_metrics["user_change"] = random.uniform(3, 8)
    
    return base_metrics