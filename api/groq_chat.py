import os
import json
from fastapi import HTTPException
from groq import Groq

class GroqChatClient:
    def __init__(self):
        self.api_key = os.getenv('GROQ_API_KEY')
        if not self.api_key:
            raise ValueError("GROQ_API_KEY environment variable not set")
        
        self.client = Groq(api_key=self.api_key)
        self.model = "llama3-8b-8192"
    
    async def chat(self, message: str, system: str = None) -> dict:
        try:
            messages = []
            
            if system:
                messages.append({
                    "role": "system",
                    "content": system
                })
            
            messages.append({
                "role": "user", 
                "content": message
            })
            
            completion = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=0.7,
                max_tokens=1024
            )
            
            return {
                "response": completion.choices[0].message.content,
                "model": self.model,
                "usage": {
                    "prompt_tokens": completion.usage.prompt_tokens,
                    "completion_tokens": completion.usage.completion_tokens,
                    "total_tokens": completion.usage.total_tokens
                }
            }
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Groq API error: {str(e)}")

# Global instance
groq_client = GroqChatClient() if os.getenv('GROQ_API_KEY') else None