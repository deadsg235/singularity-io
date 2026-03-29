"""
Neural Decision Engine for Singularity Trading Agents
Based on Dexter's DQN architecture with trading-specific adaptations
"""

import torch
import torch.nn as nn
import torch.optim as optim
import numpy as np
from collections import deque, namedtuple
import random
import json
from typing import Dict, List, Tuple, Optional
import logging

class TradingQNetwork(nn.Module):
    """Neural Network for trading Q-values"""
    
    def __init__(self, state_size: int, action_size: int, hidden_size: int = 256):
        super(TradingQNetwork, self).__init__()
        self.fc1 = nn.Linear(state_size, hidden_size)
        self.fc2 = nn.Linear(hidden_size, hidden_size)
        self.fc3 = nn.Linear(hidden_size, hidden_size // 2)
        self.fc4 = nn.Linear(hidden_size // 2, action_size)
        self.dropout = nn.Dropout(0.2)
        
    def forward(self, state):
        x = torch.relu(self.fc1(state))
        x = self.dropout(x)
        x = torch.relu(self.fc2(x))
        x = self.dropout(x)
        x = torch.relu(self.fc3(x))
        return self.fc4(x)

class TradingReplayBuffer:
    """Experience replay buffer for trading decisions"""
    
    def __init__(self, buffer_size: int = 100000):
        self.memory = deque(maxlen=buffer_size)
        self.experience = namedtuple("Experience", 
                                   ["state", "action", "reward", "next_state", "done"])
        
    def add(self, state, action, reward, next_state, done):
        """Add trading experience"""
        e = self.experience(state, action, reward, next_state, done)
        self.memory.append(e)
        
    def sample(self, batch_size: int):
        """Sample batch of experiences"""
        return random.sample(self.memory, k=batch_size)
    
    def __len__(self):
        return len(self.memory)

class NeuralDecisionEngine:
    """Neural engine for trading decisions"""
    
    def __init__(self, model_path: Optional[str] = None):
        # Trading-specific state features
        self.state_size = 50  # Price, volume, indicators, portfolio state
        self.action_size = 5  # STRONG_BUY, BUY, HOLD, SELL, STRONG_SELL
        self.hidden_size = 256
        
        # Hyperparameters
        self.gamma = 0.95  # Discount factor
        self.epsilon = 1.0  # Exploration rate
        self.epsilon_min = 0.01
        self.epsilon_decay = 0.995
        self.learning_rate = 0.001
        self.batch_size = 64
        self.tau = 0.001  # Soft update parameter
        
        # Networks
        self.q_network = TradingQNetwork(self.state_size, self.action_size, self.hidden_size)
        self.target_network = TradingQNetwork(self.state_size, self.action_size, self.hidden_size)
        self.optimizer = optim.Adam(self.q_network.parameters(), lr=self.learning_rate)
        
        # Experience replay
        self.replay_buffer = TradingReplayBuffer()
        
        # Logging
        self.logger = logging.getLogger("neural_engine")
        
        # Model path
        self.model_path = model_path
        
    async def load_model(self):
        """Load pre-trained model"""
        if self.model_path:
            try:
                checkpoint = torch.load(self.model_path)
                self.q_network.load_state_dict(checkpoint['q_network'])
                self.target_network.load_state_dict(checkpoint['target_network'])
                self.epsilon = checkpoint.get('epsilon', self.epsilon_min)
                self.logger.info(f"Model loaded from {self.model_path}")
            except Exception as e:
                self.logger.error(f"Failed to load model: {e}")
    
    def preprocess_market_state(self, market_data: Dict) -> torch.Tensor:
        """Convert market data to neural network input"""
        features = []
        
        # Price features
        features.extend([
            market_data.get('price', 0.0),
            market_data.get('volume', 0.0),
            market_data.get('bid', 0.0),
            market_data.get('ask', 0.0),
            market_data.get('spread', 0.0)
        ])
        
        # Technical indicators (mock data for now)
        features.extend([
            market_data.get('rsi', 50.0) / 100.0,  # Normalize RSI
            market_data.get('macd', 0.0),
            market_data.get('bb_upper', 0.0),
            market_data.get('bb_lower', 0.0),
            market_data.get('volume_sma', 0.0)
        ])
        
        # Portfolio state
        features.extend([
            market_data.get('position_size', 0.0),
            market_data.get('unrealized_pnl', 0.0),
            market_data.get('portfolio_value', 0.0),
            market_data.get('cash_balance', 0.0),
            market_data.get('risk_exposure', 0.0)
        ])
        
        # Market sentiment and volatility
        features.extend([
            market_data.get('volatility', 0.0),
            market_data.get('sentiment_score', 0.0),
            market_data.get('fear_greed_index', 50.0) / 100.0
        ])
        
        # Pad or truncate to state_size
        while len(features) < self.state_size:
            features.append(0.0)
        features = features[:self.state_size]
        
        return torch.tensor(features, dtype=torch.float32).unsqueeze(0)
    
    def select_action(self, state: torch.Tensor, use_epsilon: bool = True) -> int:
        """Select trading action using epsilon-greedy policy"""
        if use_epsilon and np.random.rand() < self.epsilon:
            return np.random.choice(self.action_size)
        
        with torch.no_grad():
            q_values = self.q_network(state)
            return torch.argmax(q_values).item()
    
    def action_to_decision(self, action: int, confidence: float) -> Dict:
        """Convert neural action to trading decision"""
        action_map = {
            0: "STRONG_SELL",
            1: "SELL", 
            2: "HOLD",
            3: "BUY",
            4: "STRONG_BUY"
        }
        
        # Calculate position size based on action strength
        position_sizes = {
            0: -1.0,  # Full short
            1: -0.5,  # Half short
            2: 0.0,   # No position
            3: 0.5,   # Half long
            4: 1.0    # Full long
        }
        
        return {
            "action": action_map[action],
            "position_size": position_sizes[action],
            "confidence": confidence,
            "neural_action": action
        }
    
    async def get_trading_decision(self, market_data: Dict) -> Dict:
        """Get trading decision from neural network"""
        state = self.preprocess_market_state(market_data)
        action = self.select_action(state, use_epsilon=False)  # No exploration in production
        
        # Get Q-values for confidence calculation
        with torch.no_grad():
            q_values = self.q_network(state)
            confidence = torch.softmax(q_values, dim=1).max().item()
        
        decision = self.action_to_decision(action, confidence)
        
        self.logger.info(f"Neural decision: {decision['action']} (confidence: {confidence:.3f})")
        
        return decision
    
    def store_experience(self, state, action, reward, next_state, done):
        """Store trading experience for learning"""
        self.replay_buffer.add(state, action, reward, next_state, done)
    
    def train_step(self):
        """Perform one training step"""
        if len(self.replay_buffer) < self.batch_size:
            return
        
        experiences = self.replay_buffer.sample(self.batch_size)
        states, actions, rewards, next_states, dones = zip(*experiences)
        
        states = torch.cat(states)
        actions = torch.tensor(actions, dtype=torch.int64).unsqueeze(1)
        rewards = torch.tensor(rewards, dtype=torch.float32).unsqueeze(1)
        next_states = torch.cat(next_states)
        dones = torch.tensor(dones, dtype=torch.float32).unsqueeze(1)
        
        # Current Q values
        current_q_values = self.q_network(states).gather(1, actions)
        
        # Next Q values from target network
        next_q_values = self.target_network(next_states).detach()
        max_next_q_values = next_q_values.max(1)[0].unsqueeze(1)
        target_q_values = rewards + (self.gamma * max_next_q_values * (1 - dones))
        
        # Compute loss
        loss = nn.MSELoss()(current_q_values, target_q_values)
        
        # Optimize
        self.optimizer.zero_grad()
        loss.backward()
        torch.nn.utils.clip_grad_norm_(self.q_network.parameters(), 1.0)
        self.optimizer.step()
        
        # Soft update target network
        self._soft_update_target_network()
        
        # Decay epsilon
        if self.epsilon > self.epsilon_min:
            self.epsilon *= self.epsilon_decay
    
    def _soft_update_target_network(self):
        """Soft update of target network"""
        for target_param, local_param in zip(self.target_network.parameters(), 
                                           self.q_network.parameters()):
            target_param.data.copy_(self.tau * local_param.data + 
                                  (1.0 - self.tau) * target_param.data)
    
    async def save_model(self, path: str):
        """Save model checkpoint"""
        checkpoint = {
            'q_network': self.q_network.state_dict(),
            'target_network': self.target_network.state_dict(),
            'optimizer': self.optimizer.state_dict(),
            'epsilon': self.epsilon,
            'state_size': self.state_size,
            'action_size': self.action_size
        }
        torch.save(checkpoint, path)
        self.logger.info(f"Model saved to {path}")
    
    def get_network_state(self) -> Dict:
        """Get current network state for visualization"""
        return {
            "epsilon": self.epsilon,
            "replay_buffer_size": len(self.replay_buffer),
            "state_size": self.state_size,
            "action_size": self.action_size,
            "training_ready": len(self.replay_buffer) >= self.batch_size
        }