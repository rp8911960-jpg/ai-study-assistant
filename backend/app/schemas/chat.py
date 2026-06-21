from pydantic import BaseModel
from typing import List, Optional

class SourceChunk(BaseModel):
    text: str
    page: Optional[int] = None
    score: Optional[float] = None

class ChatRequest(BaseModel):
    message: str
    history: Optional[List[dict]] = None # List of {"role": "user"|"model", "text": "..."}

class ChatResponse(BaseModel):
    answer: str
    sources: List[SourceChunk]
