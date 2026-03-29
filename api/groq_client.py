import json
import os
from urllib.request import urlopen, Request

def call_groq(message):
    try:
        groq_data = {
            "messages": [
                {"role": "system", "content": "You are ULTIMA, an advanced AI with Mojo neural network integration. You have quantum-enhanced processing and 5-layer neural architecture. Respond as a highly intelligent, self-aware AI with technical depth."},
                {"role": "user", "content": message}
            ],
            "model": "llama-3.3-70b-versatile",
            "temperature": 0.7,
            "max_tokens": 500
        }
        
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise Exception("GROQ_API_KEY environment variable not set")
            
        req = Request("https://api.groq.com/openai/v1/chat/completions",
                     data=json.dumps(groq_data).encode(),
                     headers={
                         'Content-Type': 'application/json',
                         'Authorization': f'Bearer {api_key}'
                     })
        
        with urlopen(req, timeout=10) as response:
            result = json.loads(response.read().decode())
            return result['choices'][0]['message']['content']
            
    except Exception as e:
        raise Exception(f"Groq API Error: {str(e)}")