"""
Solana blockchain client for Singularity.io
Handles connections and interactions with Solana network
"""

class SolanaClient:
    def __init__(self, network="mainnet-beta"):
        self.network = network
        self.endpoint = self._get_endpoint()
    
    def _get_endpoint(self):
        endpoints = {
            "mainnet-beta": "https://api.mainnet-beta.solana.com",
            "testnet": "https://api.testnet.solana.com",
            "devnet": "https://api.devnet.solana.com"
        }
        return endpoints.get(self.network, endpoints["devnet"])
    
    def get_network_info(self):
        return {
            "network": self.network,
            "endpoint": self.endpoint,
            "status": "connected"
        }

solana_client = SolanaClient()
