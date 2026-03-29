"""
generate_market_data.py — Generate realistic market training data for DQN.

Produces 1200 labeled market scenarios with rule-based optimal actions.
Run: python dqn-core/generate_market_data.py
"""

import json
import random
from pathlib import Path

random.seed(42)

ACTIONS = [
    'STRONG_BUY', 'BUY', 'WEAK_BUY', 'HOLD', 'WEAK_SELL',
    'SELL', 'STRONG_SELL', 'INCREASE_POSITION', 'REDUCE_POSITION', 'EXIT'
]


def optimal_action(price, rsi, macd, bb_upper, bb_lower, volume, tps, wallet):
    """Rule-based optimal action — provides supervised training signal."""
    if rsi < 25 and macd > 0 and price < bb_lower * 1.02:
        return 0  # STRONG_BUY — oversold + positive momentum + below lower band
    elif rsi < 35 and price < bb_lower * 1.05:
        return 1  # BUY — oversold + near lower band
    elif rsi < 45 and macd > 0:
        return 2  # WEAK_BUY — mild oversold + positive MACD
    elif rsi > 75 and macd < 0 and price > bb_upper * 0.98:
        return 6  # STRONG_SELL — overbought + negative momentum + near upper band
    elif rsi > 65 and price > bb_upper * 0.95:
        return 5  # SELL — overbought + near upper band
    elif rsi > 55 and macd < 0:
        return 4  # WEAK_SELL — mild overbought + negative MACD
    elif wallet > 10 and rsi < 40:
        return 7  # INCREASE_POSITION — have capital + oversold
    elif wallet > 5 and rsi > 60:
        return 8  # REDUCE_POSITION — have position + overbought
    elif rsi > 80 or (price > bb_upper * 1.05 and macd < -2):
        return 9  # EXIT — extreme overbought or breakout reversal
    else:
        return 3  # HOLD — neutral conditions


def generate_scenario():
    base_price = random.uniform(80, 280)
    volatility = random.uniform(0.01, 0.08)
    price = base_price * (1 + random.gauss(0, volatility))
    price = max(10.0, price)

    rsi = random.uniform(10, 90)
    macd = random.gauss(0, 3)
    bb_width = price * random.uniform(0.03, 0.12)
    bb_upper = price + bb_width
    bb_lower = price - bb_width
    volume = random.uniform(1e8, 2e9)
    tps = random.uniform(1500, 5000)
    wallet = random.uniform(0, 20)

    action = optimal_action(price, rsi, macd, bb_upper, bb_lower, volume, tps, wallet)

    # 8 market features + 120 padding zeros = 128-dim state
    features = [
        round(price, 4),
        round(volume, 0),
        round(rsi, 4),
        round(macd, 4),
        round(bb_upper, 4),
        round(bb_lower, 4),
        round(tps, 1),
        round(wallet, 4),
    ] + [0.0] * 120

    content = ' '.join(str(f) for f in features)
    return {'role': 'market', 'content': content, 'action': action}


if __name__ == '__main__':
    scenarios = [generate_scenario() for _ in range(1200)]

    from collections import Counter
    dist = Counter(s['action'] for s in scenarios)
    print(f"Generated {len(scenarios)} scenarios")
    print("Action distribution:")
    for idx, count in sorted(dist.items()):
        print(f"  {idx:2d} {ACTIONS[idx]:20s}: {count:4d} ({count/len(scenarios)*100:.1f}%)")

    out = Path('dqn-core/training_data/market_training_data.json')
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(scenarios, separators=(',', ':')))
    print(f"\nSaved to {out}")
