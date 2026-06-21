import os
from typing import List, Dict, Any, Type
from google import genai
from google.genai import types
from google.genai.errors import APIError
from pydantic import BaseModel
from app.core.config import settings

class GeminiService:
    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY")
        self._client = None

    @property
    def client(self):
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY is not set in environment or settings. Please check your .env file.")
        if self._client is None:
            self._client = genai.Client(api_key=self.api_key)
        return self._client

    def get_embeddings(self, texts: List[str]) -> List[List[float]]:
        """
        Generate embeddings for a list of texts using the text-embedding-004 model via REST API.
        This bypasses SDK batching bugs.
        """
        if not texts:
            return []
            
        import urllib.request
        import urllib.error
        import json
        
        # 1. Select the active embedding model verified from debug output
        active_model = "models/gemini-embedding-001"
            
        # 2. Use the discovered active model for batch embeddings
        model_basename = active_model.split("/")[-1]
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_basename}:batchEmbedContents?key={self.api_key}"
        
        requests_payload = []
        for text in texts:
            requests_payload.append({
                "model": active_model,
                "content": {
                    "parts": [{"text": text}]
                }
            })
            
        data = json.dumps({"requests": requests_payload}).encode('utf-8')
        req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
        
        try:
            with urllib.request.urlopen(req) as response:
                result = json.loads(response.read().decode('utf-8'))
                embeddings = []
                for emb in result.get('embeddings', []):
                    embeddings.append(emb['values'])
                return embeddings
        except urllib.error.HTTPError as e:
            error_msg = e.read().decode('utf-8')
            raise RuntimeError(f"Gemini Batch Embeddings API Error on {active_model}: {error_msg}")
        except Exception as e:
            raise RuntimeError(f"Unexpected error in Gemini Embeddings: {str(e)}")

    def generate_text(self, prompt: str, system_instruction: str = None) -> str:
        """
        Generate text response using gemini-2.5-flash.
        """
        try:
            config = None
            if system_instruction:
                config = types.GenerateContentConfig(
                    system_instruction=system_instruction
                )
            
            response = self.client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
                config=config
            )
            return response.text
        except APIError as e:
            raise RuntimeError(f"Gemini API Error: {str(e)}")

    def generate_text_stream(self, prompt: str, system_instruction: str = None):
        """
        Generate text response stream token-by-token using gemini-2.5-flash.
        """
        try:
            config = None
            if system_instruction:
                config = types.GenerateContentConfig(
                    system_instruction=system_instruction
                )
            
            response = self.client.models.generate_content_stream(
                model="gemini-2.5-flash",
                contents=prompt,
                config=config
            )
            for chunk in response:
                yield chunk.text
        except APIError as e:
            raise RuntimeError(f"Gemini Streaming API Error: {str(e)}")

    def generate_structured_json(
        self, 
        prompt: str, 
        response_schema: Type[BaseModel], 
        system_instruction: str = None
    ) -> Any:
        """
        Generate structured JSON output validated against a Pydantic schema using gemini-2.5-flash.
        """
        try:
            config = types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=response_schema,
                system_instruction=system_instruction,
                temperature=0.2 # Lower temperature for structured extraction tasks
            )
            
            response = self.client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
                config=config
            )
            
            # Use Pydantic to parse and validate the JSON text returned by the model
            return response_schema.model_validate_json(response.text)
        except APIError as e:
            raise RuntimeError(f"Gemini Structured JSON API Error: {str(e)}")
        except Exception as e:
            raise RuntimeError(f"Failed to generate structured JSON: {str(e)}")

gemini_service = GeminiService()
