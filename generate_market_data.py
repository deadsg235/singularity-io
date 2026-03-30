import json
import random
import math

random.seed(42)
scenarios = []

for i in range(500):
    price = random.uniform(80, 300)
    volume = random.uniform(1e8, 2e9)
    rsi = random.uniform(10, 90)
    macd = random.uniform(-5, 5)
    bb_width = price * random.uniform(0.03, 0.08)
    bb_upper = price + bb_width * random.uniform(0.5, 1.5)
    bb_lower = price - bb_width * random.uniform(0.5, 1.5)
    sol_tps = random.uniform(1500, 5000)
    wallet = random.uniform(0, 50)

    if rsi < 20:
        action = 0
    elif rsi < 30 or price < bb_lower * 0.99:
        action = 1
    elif rsi < 45:
        action = 2
    elif rsi > 80:
        action = 6
    elif rsi > 70 or price > bb_upper * 1.01:
        action = 5
    elif rsi > 55:
        action = 4
    elif macd > 2 and rsi < 60:
        action = 7
    elif macd < -2 and rsi > 40:
        action = 8
    else:
        action = 3

    vec = [0.0] * 128
    vec[0] = price
    vec[1] = volume
    vec[2] = rsi
    vec[3] = macd
    vec[4] = bb_upper
    vec[5] = bb_lower
    vec[6] = sol_tps
    vec[7] = wallet
    for j in range(8, 16):
        vec[j] = random.uniform(-1, 1)

    content = " ".join(f"{v:.4f}" for v in vec)
    scenarios.append({"role": "market", "content": content, "action": action})

with open("dqn-core/training_data/market_training_data.json", "w") as f:
    json.dump(scenarios, f, indent=2)

print(f"Generated {len(scenarios)} market scenarios")
action_counts = {}
for s in scenarios:
    a = s["action"]
    action_counts[a] = action_counts.get(a, 0) + 1
print("Action distribution:", action_counts)
