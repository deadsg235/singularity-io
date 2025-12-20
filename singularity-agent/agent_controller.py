"""
Singularity Agent Controller
Main orchestration system for deploying and managing trading agents
"""

import asyncio
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime
import json

from .base_agent import AgentOrchestrator, AgentConfig, AgentStatus
from .dca_agent import DCAAgent
from .neural_engine import NeuralDecisionEngine

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

class AgentController:
    """Main controller for Singularity trading agents"""
    
    def __init__(self, config_path: Optional[str] = None):
        self.orchestrator = AgentOrchestrator()
        self.logger = logging.getLogger("agent_controller")
        self.config_path = config_path
        self.deployed_agents: Dict[str, Any] = {}
        
    async def initialize(self):
        """Initialize the agent controller"""
        self.logger.info("Initializing Singularity Agent Controller")
        
        if self.config_path:
            await self._load_config()
        
        self.logger.info("Agent Controller initialized")
    
    async def _load_config(self):
        """Load configuration from file"""
        try:
            with open(self.config_path, 'r') as f:
                config = json.load(f)
                self.logger.info(f"Loaded configuration from {self.config_path}")
                return config
        except Exception as e:
            self.logger.error(f"Failed to load config: {e}")
            return {}
    
    async def deploy_dca_agent(
        self,
        name: str,
        tokens: List[str],
        dca_amount: float,
        interval_seconds: int,
        max_position_size: float = 10000.0,
        enable_neural: bool = True
    ) -> str:
        """Deploy a DCA trading agent"""
        
        self.logger.info(f"Deploying DCA agent: {name}")
        
        # Create agent configuration
        agent_config = AgentConfig(
            name=name,
            strategy="dca",
            max_position_size=max_position_size,
            risk_tolerance=0.5,
            stop_loss=0.1,
            take_profit=0.3,
            enabled_tools=["price_analyzer", "risk_manager"],
            neural_model_path="models/dca_model.pth" if enable_neural else None
        )
        
        # DCA specific configuration
        dca_config = {
            'dca_amount': dca_amount,
            'dca_interval': interval_seconds,
            'target_tokens': tokens,
            'max_slippage': 0.02,
            'enable_neural_override': enable_neural
        }
        
        # Create and register agent
        agent = DCAAgent(agent_config, dca_config)
        await self.orchestrator.register_agent(agent)
        await agent.start()
        
        # Store deployment info
        self.deployed_agents[name] = {
            "type": "dca",
            "agent": agent,
            "deployed_at": datetime.now().isoformat(),
            "config": {
                "tokens": tokens,
                "dca_amount": dca_amount,
                "interval": interval_seconds
            }
        }
        
        # Start the DCA loop
        asyncio.create_task(agent.run_dca_loop())
        
        self.logger.info(f"DCA agent {name} deployed successfully")
        
        return name
    
    async def deploy_arbitrage_agent(
        self,
        name: str,
        exchanges: List[str],
        min_profit_threshold: float = 0.01
    ) -> str:
        """Deploy an arbitrage trading agent"""
        # Placeholder for arbitrage agent
        self.logger.info(f"Arbitrage agent deployment not yet implemented: {name}")
        return name
    
    async def deploy_grid_agent(
        self,
        name: str,
        token: str,
        grid_levels: int,
        price_range: tuple
    ) -> str:
        """Deploy a grid trading agent"""
        # Placeholder for grid agent
        self.logger.info(f"Grid agent deployment not yet implemented: {name}")
        return name
    
    async def stop_agent(self, name: str) -> bool:
        """Stop a deployed agent"""
        if name not in self.deployed_agents:
            self.logger.error(f"Agent {name} not found")
            return False
        
        agent = self.deployed_agents[name]["agent"]
        await agent.stop()
        
        self.logger.info(f"Agent {name} stopped")
        return True
    
    async def pause_agent(self, name: str) -> bool:
        """Pause a deployed agent"""
        if name not in self.deployed_agents:
            self.logger.error(f"Agent {name} not found")
            return False
        
        agent = self.deployed_agents[name]["agent"]
        await agent.pause()
        
        self.logger.info(f"Agent {name} paused")
        return True
    
    async def resume_agent(self, name: str) -> bool:
        """Resume a paused agent"""
        if name not in self.deployed_agents:
            self.logger.error(f"Agent {name} not found")
            return False
        
        agent = self.deployed_agents[name]["agent"]
        await agent.resume()
        
        self.logger.info(f"Agent {name} resumed")
        return True
    
    async def get_agent_status(self, name: str) -> Optional[Dict[str, Any]]:
        """Get status of a specific agent"""
        if name not in self.deployed_agents:
            return None
        
        agent = self.deployed_agents[name]["agent"]
        status = await agent.get_status()
        
        # Add deployment info
        status["deployment_info"] = {
            "deployed_at": self.deployed_agents[name]["deployed_at"],
            "type": self.deployed_agents[name]["type"],
            "config": self.deployed_agents[name]["config"]
        }
        
        return status
    
    async def get_all_agents_status(self) -> Dict[str, Any]:
        """Get status of all deployed agents"""
        system_status = await self.orchestrator.get_system_status()
        
        # Add deployment details
        for name in self.deployed_agents:
            if name in system_status["agents"]:
                system_status["agents"][name]["deployment_info"] = {
                    "deployed_at": self.deployed_agents[name]["deployed_at"],
                    "type": self.deployed_agents[name]["type"]
                }
        
        return system_status
    
    async def shutdown(self):
        """Shutdown all agents and controller"""
        self.logger.info("Shutting down Agent Controller")
        await self.orchestrator.stop_all_agents()
        self.logger.info("Agent Controller shutdown complete")

# CLI Interface
async def main():
    """Main entry point for agent deployment"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Singularity Agent Deployment')
    parser.add_argument('--strategy', type=str, required=True, 
                       choices=['dca', 'arbitrage', 'grid', 'momentum'],
                       help='Trading strategy to deploy')
    parser.add_argument('--name', type=str, required=True,
                       help='Agent name')
    parser.add_argument('--tokens', type=str, nargs='+', default=['SOL'],
                       help='Target tokens')
    parser.add_argument('--amount', type=float, default=100.0,
                       help='DCA amount in USD')
    parser.add_argument('--interval', type=int, default=3600,
                       help='DCA interval in seconds')
    parser.add_argument('--neural', action='store_true',
                       help='Enable neural decision engine')
    
    args = parser.parse_args()
    
    # Initialize controller
    controller = AgentController()
    await controller.initialize()
    
    # Deploy agent based on strategy
    if args.strategy == 'dca':
        agent_id = await controller.deploy_dca_agent(
            name=args.name,
            tokens=args.tokens,
            dca_amount=args.amount,
            interval_seconds=args.interval,
            enable_neural=args.neural
        )
        
        print(f"\n✅ DCA Agent deployed successfully!")
        print(f"Agent ID: {agent_id}")
        print(f"Strategy: Dollar Cost Averaging")
        print(f"Tokens: {', '.join(args.tokens)}")
        print(f"Amount: ${args.amount} per interval")
        print(f"Interval: {args.interval}s ({args.interval/3600:.1f} hours)")
        print(f"Neural Engine: {'Enabled' if args.neural else 'Disabled'}")
        
        # Keep running
        try:
            while True:
                await asyncio.sleep(10)
                status = await controller.get_agent_status(agent_id)
                if status:
                    print(f"\n📊 Agent Status: {status['status']}")
                    print(f"Total Trades: {status['performance']['total_trades']}")
                    print(f"Win Rate: {status['performance']['win_rate']:.2%}")
        except KeyboardInterrupt:
            print("\n\n🛑 Shutting down agent...")
            await controller.shutdown()
    
    else:
        print(f"Strategy {args.strategy} not yet implemented")

if __name__ == "__main__":
    asyncio.run(main())