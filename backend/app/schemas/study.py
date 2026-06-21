from pydantic import BaseModel
from typing import List, Optional

# Summary Schema
class SummaryResponse(BaseModel):
    title: str
    overview: str
    key_points: List[str]
    detailed_chapters: List[dict] # List of {"heading": "...", "content": "..."}

# MCQ Schemas
class MCQItem(BaseModel):
    question: str
    options: List[str]
    correct_option_index: int  # 0 to 3
    explanation: str

class MCQGenerationRequest(BaseModel):
    num_questions: int = 5
    difficulty: Optional[str] = "medium"  # easy, medium, hard

class MCQListResponse(BaseModel):
    questions: List[MCQItem]

# Viva Schemas
class VivaItem(BaseModel):
    question: str
    answer: str
    explanation: Optional[str] = None

class VivaGenerationRequest(BaseModel):
    num_questions: int = 5

class VivaListResponse(BaseModel):
    questions: List[VivaItem]
