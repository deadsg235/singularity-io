import os
import requests
import json

class SolanaClient:
    def __init__(self):
        self.rpc_url = os.getenv("SOLANA_RPC_URL", "https://api.mainnet-beta.solana.com")
    
    def _make_rpc_call(self, method: str, params: list = None):
        """Make RPC call to Solana network"""
        payload = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": method,
            "params": params or []
        }
        try:
            response = requests.post(self.rpc_url, json=payload, timeout=10)
            return response.json()
        except Exception as e:
            return {"error": str(e)}
    
    def get_balance(self, address: str):
        """Get SOL balance for address"""
        try:
            result = self._make_rpc_call("getBalance", [address])
            if "result" in result:
                return result["result"]["value"] / 1e9  # Convert lamports to SOL
            return 0.0
        except Exception:
            return 0.0
    
    def get_token_balance(self, wallet_address: str, token_mint: str):
        """Get token balance for wallet"""
        try:
            result = self._make_rpc_call("getTokenAccountsByOwner", [
                wallet_address,
                {"mint": token_mint},
                {"encoding": "jsonParsed"}
            ])
            if "result" in result and result["result"]["value"]:
                account = result["result"]["value"][0]
                return float(account["account"]["data"]["parsed"]["info"]["tokenAmount"]["uiAmount"] or 0)
            return 0.0
        except Exception:
            return 0.0
    
    def get_network_stats(self):
        """Get network statistics"""
        try:
            slot_result = self._make_rpc_call("getSlot")
            epoch_result = self._make_rpc_call("getEpochInfo")
            
            stats = {}
            if "result" in slot_result:
                stats["current_slot"] = slot_result["result"]
            if "result" in epoch_result:
                epoch_info = epoch_result["result"]
                stats.update({
                    "epoch": epoch_info.get("epoch", 0),
                    "slot_index": epoch_info.get("slotIndex", 0),
                    "slots_in_epoch": epoch_info.get("slotsInEpoch", 0)
                })
            return stats
        except Exception as e:
            return {"error": str(e)}

solana_client = SolanaClient()
