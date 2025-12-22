"""
S-IO Protocol Test Client
Demonstrates how to use the S-IO protocol for payment-gated API access
"""

import asyncio
import json
import base64
from typing import Dict, Any
import httpx

class SIOTestClient:
    """Test client for S-IO protocol demonstration"""
    
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.mock_wallet = "TestWallet1234567890123456789012345678901"
        self.mock_signature = "5j7k8l9m0n1p2q3r4s5t6u7v8w9x0y1z2a3b4c5d6e7f8g9h0i1j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6y7z8a9b0c1d2e3f4g5h6i7j8k9l0m1n2o3p4q5r6s7t8u9v0w1x2y3z4a5b6c7d8e9f0g1h2i3j4k5l6m7n8o9p0q1r2s3t4u5v6w7x8y9z0"
    
    def create_mock_payment(self, amount: str, description: str = "") -> str:
        """Create a mock S-IO payment payload"""
        payload = {
            "protocol": "s-io",
            "version": 1,
            "signature": self.mock_signature,
            "transaction": base64.b64encode(b"mock_transaction_data").decode(),
            "payer": self.mock_wallet,
            "timestamp": 1704067200
        }
        
        return base64.b64encode(json.dumps(payload).encode()).decode()
    
    async def test_payment_required(self, endpoint: str):
        """Test that endpoint returns 402 without payment"""
        print(f"\n🔒 Testing payment required for {endpoint}")
        
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{self.base_url}{endpoint}")
            
            if response.status_code == 402:
                print("✅ Correctly returned 402 Payment Required")
                data = response.json()
                print(f"   Protocol: {data.get('protocol', 'unknown')}")
                print(f"   Error: {data.get('error', 'unknown')}")
                if 'requirements' in data:
                    req = data['requirements']
                    print(f"   Amount: {req.get('amount', 'unknown')} SIO")
                    print(f"   Description: {req.get('description', 'unknown')}")
                return data
            else:
                print(f"❌ Expected 402, got {response.status_code}")
                return None
    
    async def test_payment_success(self, endpoint: str, amount: str, description: str = ""):
        """Test successful payment and resource access"""
        print(f"\n💰 Testing successful payment for {endpoint}")
        
        payment_header = self.create_mock_payment(amount, description)
        headers = {\n            "X-SIO-PAYMENT": payment_header,\n            "Content-Type": "application/json"\n        }\n        \n        async with httpx.AsyncClient() as client:\n            response = await client.get(f"{self.base_url}{endpoint}", headers=headers)\n            \n            if response.status_code == 200:\n                print("✅ Payment accepted, resource delivered")\n                \n                # Check for settlement response\n                settlement_header = response.headers.get("X-SIO-SETTLEMENT")\n                if settlement_header:\n                    settlement = json.loads(base64.b64decode(settlement_header).decode())\n                    print(f"   Settlement: {settlement.get('success', False)}")\n                    print(f"   Signature: {settlement.get('signature', 'none')[:20]}...")\n                \n                data = response.json()\n                print(f"   Data keys: {list(data.keys())}")\n                return data\n            else:\n                print(f"❌ Expected 200, got {response.status_code}")\n                print(f"   Response: {response.text[:200]}...")\n                return None\n    \n    async def test_discovery(self):\n        """Test S-IO resource discovery"""\n        print(f"\n🔍 Testing S-IO resource discovery")\n        \n        async with httpx.AsyncClient() as client:\n            response = await client.get(f"{self.base_url}/api/sio/discover")\n            \n            if response.status_code == 200:\n                print("✅ Discovery endpoint accessible")\n                data = response.json()\n                print(f"   Protocol: {data.get('protocol', 'unknown')}")\n                print(f"   Version: {data.get('version', 'unknown')}")\n                print(f"   Resources: {len(data.get('resources', []))}")\n                \n                for resource in data.get('resources', []):\n                    print(f"     - {resource.get('endpoint')}: {resource.get('cost')} SIO")\n                \n                return data\n            else:\n                print(f"❌ Discovery failed: {response.status_code}")\n                return None\n    \n    async def run_full_test_suite(self):\n        """Run complete S-IO protocol test suite"""\n        print("🚀 Starting S-IO Protocol Test Suite")\n        print("=" * 50)\n        \n        # Test discovery first\n        discovery_data = await self.test_discovery()\n        \n        if not discovery_data:\n            print("❌ Discovery failed, skipping other tests")\n            return\n        \n        # Test each discovered resource\n        for resource in discovery_data.get('resources', []):\n            endpoint = resource.get('endpoint')\n            cost = resource.get('cost')\n            description = resource.get('description', '')\n            \n            # Test payment required\n            await self.test_payment_required(endpoint)\n            \n            # Test successful payment\n            await self.test_payment_success(endpoint, cost, description)\n        \n        print("\\n" + "=" * 50)\n        print("✅ S-IO Protocol Test Suite Complete")\n    \n    async def test_health_check(self):\n        """Test basic API health"""\n        print("🏥 Testing API health")\n        \n        async with httpx.AsyncClient() as client:\n            response = await client.get(f"{self.base_url}/api/health")\n            \n            if response.status_code == 200:\n                print("✅ API is healthy")\n                return response.json()\n            else:\n                print(f"❌ API health check failed: {response.status_code}")\n                return None


async def main():\n    """Main test function"""\n    client = SIOTestClient()\n    \n    # Test API health first\n    health = await client.test_health_check()\n    if not health:\n        print("❌ API not available, exiting")\n        return\n    \n    # Run full test suite\n    await client.run_full_test_suite()\n    \n    print("\\n🎉 All tests completed!")\n\n\nif __name__ == "__main__":\n    asyncio.run(main())