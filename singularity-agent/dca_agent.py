"""
DCA (Dollar Cost Averaging) Trading Agent
Specialized agent for systematic DCA strategies
"""

import asyncio
import time
from typing import Dict, Any, List
from datetime import datetime, timedelta
import logging

from .base_agent import BaseAgent, AgentConfig, MarketData, TradingDecision, AgentStatus
from .neural_engine import NeuralDecisionEngine

class DCAAgent(BaseAgent):
    """Dollar Cost Averaging trading agent"""
    
    def __init__(self, config: AgentConfig, dca_config: Dict[str, Any]):
        super().__init__(config)
        
        # DCA specific configuration
        self.dca_amount = dca_config.get('dca_amount', 100.0)  # USD per interval
        self.dca_interval = dca_config.get('dca_interval', 3600)  # seconds
        self.target_tokens = dca_config.get('target_tokens', ['SOL', 'BTC', 'ETH'])
        self.max_slippage = dca_config.get('max_slippage', 0.02)  # 2%
        self.enable_neural_override = dca_config.get('enable_neural_override', True)
        
        # State tracking
        self.last_purchase_times = {}
        self.total_invested = {}
        self.total_tokens_bought = {}
        self.average_buy_price = {}
        
        # Initialize tracking for each token
        for token in self.target_tokens:
            self.last_purchase_times[token] = 0
            self.total_invested[token] = 0.0
            self.total_tokens_bought[token] = 0.0
            self.average_buy_price[token] = 0.0
    
    async def analyze_market(self, market_data: MarketData) -> TradingDecision:
        """Analyze market for DCA opportunities"""
        token = market_data.symbol
        current_time = time.time()
        
        # Check if it's time for DCA purchase
        time_since_last = current_time - self.last_purchase_times.get(token, 0)
        
        if time_since_last < self.dca_interval:
            return TradingDecision(
                action="HOLD",
                amount=0.0,
                confidence=1.0,
                reason=f"DCA interval not reached. {self.dca_interval - time_since_last:.0f}s remaining",
                risk_score=0.0
            )
        
        # Basic DCA decision
        base_decision = TradingDecision(
            action="BUY",
            amount=self.dca_amount / market_data.price,
            confidence=0.8,
            reason="Scheduled DCA purchase",
            risk_score=0.2
        )
        
        # Neural network override if enabled
        if self.enable_neural_override and self.neural_engine:
            neural_decision = await self._get_neural_override(market_data, base_decision)
            if neural_decision:
                return neural_decision
        
        # Risk checks
        if not await self._risk_check(market_data, base_decision):
            return TradingDecision(
                action="HOLD",
                amount=0.0,
                confidence=0.9,
                reason="Risk check failed - high slippage or volatility",
                risk_score=0.8
            )
        
        return base_decision
    
    async def _get_neural_override(self, market_data: MarketData, base_decision: TradingDecision) -> TradingDecision:
        """Get neural network override for DCA decision"""
        try:
            # Prepare market data for neural engine
            neural_input = {
                'price': market_data.price,
                'volume': market_data.volume,
                'bid': market_data.bid,
                'ask': market_data.ask,
                'spread': market_data.spread,
                'position_size': self.total_tokens_bought.get(market_data.symbol, 0.0),
                'unrealized_pnl': self._calculate_unrealized_pnl(market_data),
                'portfolio_value': sum(self.total_invested.values()),
                'cash_balance': self.dca_amount,
                'risk_exposure': self._calculate_risk_exposure()
            }
            
            neural_result = await self.neural_engine.get_trading_decision(neural_input)
            
            # Override logic based on neural confidence
            if neural_result['confidence'] > 0.7:
                if neural_result['action'] in ['STRONG_SELL', 'SELL']:
                    # Neural network suggests selling - skip DCA
                    return TradingDecision(
                        action="HOLD",
                        amount=0.0,
                        confidence=neural_result['confidence'],
                        reason=f"Neural override: {neural_result['action']} signal detected",
                        risk_score=0.6
                    )
                elif neural_result['action'] == 'STRONG_BUY':
                    # Neural network very bullish - increase DCA amount
                    return TradingDecision(
                        action="BUY",
                        amount=(self.dca_amount * 1.5) / market_data.price,
                        confidence=neural_result['confidence'],
                        reason="Neural override: Strong buy signal - increased DCA",
                        risk_score=0.3
                    )
            
        except Exception as e:
            self.logger.error(f"Neural override failed: {e}")
        
        return None
    
    async def _risk_check(self, market_data: MarketData, decision: TradingDecision) -> bool:
        """Perform risk checks before executing DCA"""
        # Check slippage
        if market_data.spread / market_data.price > self.max_slippage:
            self.logger.warning(f"High slippage detected: {market_data.spread / market_data.price:.3f}")
            return False
        
        # Check for extreme volatility (simple check)
        if hasattr(market_data, 'volatility') and market_data.volatility > 0.1:
            self.logger.warning(f"High volatility detected: {market_data.volatility:.3f}")
            return False
        
        # Check position size limits
        current_position_value = self.total_tokens_bought.get(market_data.symbol, 0.0) * market_data.price
        if current_position_value > self.config.max_position_size:
            self.logger.warning(f"Position size limit reached: {current_position_value}")
            return False
        
        return True
    
    async def execute_trade(self, decision: TradingDecision) -> bool:
        """Execute DCA trade"""
        if decision.action != "BUY":
            return True  # No trade to execute
        
        try:
            # Simulate trade execution (replace with actual exchange API)
            success = await self._execute_buy_order(decision)
            
            if success:
                # Update tracking
                token = "SOL"  # This should come from market_data
                current_price = decision.amount * 100  # Reverse calculate price
                
                self.last_purchase_times[token] = time.time()
                self.total_invested[token] += self.dca_amount
                self.total_tokens_bought[token] += decision.amount
                
                # Update average buy price
                if self.total_tokens_bought[token] > 0:
                    self.average_buy_price[token] = self.total_invested[token] / self.total_tokens_bought[token]
                
                # Update performance metrics
                self.performance_metrics["total_trades"] += 1
                self.performance_metrics["successful_trades"] += 1
                
                self.logger.info(f"DCA purchase executed: {decision.amount:.6f} tokens for ${self.dca_amount}")
                
                return True
            
        except Exception as e:
            self.logger.error(f"Trade execution failed: {e}")
            self.status = AgentStatus.ERROR
        
        return False
    
    async def _execute_buy_order(self, decision: TradingDecision) -> bool:
        """Execute buy order (mock implementation)"""
        # This would integrate with actual exchange APIs
        await asyncio.sleep(0.1)  # Simulate network delay
        
        # Mock success rate of 95%
        import random
        return random.random() > 0.05
    
    def _calculate_unrealized_pnl(self, market_data: MarketData) -> float:
        """Calculate unrealized P&L for the token"""
        token = market_data.symbol
        if token not in self.total_tokens_bought or self.total_tokens_bought[token] == 0:
            return 0.0
        
        current_value = self.total_tokens_bought[token] * market_data.price
        invested_value = self.total_invested[token]
        
        return current_value - invested_value
    
    def _calculate_risk_exposure(self) -> float:
        """Calculate overall risk exposure"""
        total_invested = sum(self.total_invested.values())
        if total_invested == 0:
            return 0.0
        
        return min(total_invested / self.config.max_position_size, 1.0)
    
    async def get_status(self) -> Dict[str, Any]:
        """Get DCA agent status"""
        base_status = await super().get_status()
        
        dca_status = {
            "dca_amount": self.dca_amount,
            "dca_interval": self.dca_interval,
            "target_tokens": self.target_tokens,
            "total_invested": self.total_invested,
            "total_tokens_bought": self.total_tokens_bought,
            "average_buy_prices": self.average_buy_price,
            "next_purchase_times": {
                token: self.last_purchase_times.get(token, 0) + self.dca_interval
                for token in self.target_tokens
            }
        }
        
        base_status.update({"dca_config": dca_status})
        return base_status
    
    async def run_dca_loop(self):
        """Main DCA execution loop"""
        self.logger.info("Starting DCA loop")
        
        while self.status == AgentStatus.ACTIVE:
            try:
                for token in self.target_tokens:
                    # Mock market data (replace with real data feed)
                    market_data = MarketData(
                        symbol=token,
                        price=100.0,  # Mock price
                        volume=1000000.0,
                        timestamp=int(time.time()),
                        bid=99.9,
                        ask=100.1,
                        spread=0.2
                    )
                    
                    decision = await self.analyze_market(market_data)
                    
                    if decision.action == "BUY":
                        await self.execute_trade(decision)
                
                # Wait before next check
                await asyncio.sleep(60)  # Check every minute
                
            except Exception as e:
                self.logger.error(f"Error in DCA loop: {e}")
                self.status = AgentStatus.ERROR
                break
        
        self.logger.info("DCA loop stopped")