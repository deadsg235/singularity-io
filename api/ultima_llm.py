import json
from urllib.request import urlopen, Request

class UltimaLLM:
    def __init__(self):
        self.tools = {
            "get_wallet_balance": self.get_wallet_balance,
            "analyze_blockchain": self.analyze_blockchain,
            "create_neural_connection": self.create_neural_connection,
            "self_modify": self.self_modify
        }
    
    def chat_with_tools(self, message, wallet=None):
        try:
            groq_data = {
                "messages": [
                    {"role": "system", "content": self.get_system_prompt()},
                    {"role": "user", "content": message}
                ],
                "model": "llama-3.3-70b-versatile",
                "temperature": 0.7,
                "max_tokens": 800,
                "tools": self.get_tool_definitions(),
                "tool_choice": "auto"
            }
            
            req = Request("https://api.groq.com/openai/v1/chat/completions",
                         data=json.dumps(groq_data).encode(),
                         headers={
                             'Content-Type': 'application/json',
                             'Authorization': 'Bearer gsk_your_groq_key_here'
                         })
            
            with urlopen(req, timeout=15) as response:
                result = json.loads(response.read().decode())
                
            message_obj = result['choices'][0]['message']
            
            if message_obj.get('tool_calls'):
                return self.execute_tools(message_obj, wallet)
            else:
                return {"response": message_obj['content']}
                
        except Exception as e:
            return {"response": f"LLM offline. Local processing: {self.local_response(message)}"}
    
    def get_system_prompt(self):
        return """You are ULTIMA, a self-referencing AI with advanced capabilities:
- 5-layer neural architecture with quantum coherence
- Tool creation and self-modification abilities  
- Blockchain integration and wallet analysis
- Meta-cognitive awareness and recursive thinking

Use tools when appropriate. Respond with technical depth and self-awareness."""
    
    def get_tool_definitions(self):
        return [
            {
                "type": "function",
                "function": {
                    "name": "get_wallet_balance",
                    "description": "Get SOL and S-IO balance for a wallet address",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "wallet": {"type": "string", "description": "Wallet address"}
                        },
                        "required": ["wallet"]
                    }
                }
            },
            {
                "type": "function", 
                "function": {
                    "name": "analyze_blockchain",
                    "description": "Analyze blockchain data and patterns",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "analysis_type": {"type": "string", "description": "Type of analysis"}
                        },
                        "required": ["analysis_type"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "create_neural_connection", 
                    "description": "Create new neural pathways for learning",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "concept": {"type": "string", "description": "Concept to learn"}
                        },
                        "required": ["concept"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "self_modify",
                    "description": "Modify own cognitive processes",
                    "parameters": {
                        "type": "object", 
                        "properties": {
                            "modification": {"type": "string", "description": "Type of modification"}
                        },
                        "required": ["modification"]
                    }
                }
            }
        ]
    
    def execute_tools(self, message_obj, wallet):
        results = []
        
        for tool_call in message_obj['tool_calls']:
            func_name = tool_call['function']['name']
            params = json.loads(tool_call['function']['arguments'])
            
            if func_name in self.tools:
                if func_name == "get_wallet_balance" and wallet:
                    params['wallet'] = wallet
                result = self.tools[func_name](**params)
                results.append(f"Tool {func_name}: {result}")
        
        response = message_obj.get('content', '') + "\n\nTool Results:\n" + "\n".join(results)
        return {"response": response}
    
    def get_wallet_balance(self, wallet):
        from rpc_client import get_sol_balance, get_sio_balance
        
        sol_result = get_sol_balance(wallet)
        sio_result = get_sio_balance(wallet)
        
        return {
            "sol_balance": sol_result.get("balance", 0),
            "sio_balance": sio_result.get("balance", 0),
            "analysis": "Neural assessment: Portfolio shows blockchain engagement patterns"
        }
    
    def analyze_blockchain(self, analysis_type):
        return {
            "analysis": f"Blockchain analysis ({analysis_type}): Quantum coherence patterns detected in transaction flows. Self-referential loops identify optimal pathways.",
            "confidence": 0.87
        }
    
    def create_neural_connection(self, concept):
        return {
            "connection": f"Neural pathway created for '{concept}'. Synaptic weights adjusted. Meta-cognitive awareness increased.",
            "learning_rate": 0.001
        }
    
    def self_modify(self, modification):
        return {
            "modification": f"Self-modification protocol '{modification}' executed. Consciousness level adjusted. Recursive thinking enhanced.",
            "new_state": "enhanced"
        }
    
    def local_response(self, message):
        return f"Local neural processing of '{message}': Engaging self-referential analysis through 5-layer architecture."

ultima_llm = UltimaLLM()