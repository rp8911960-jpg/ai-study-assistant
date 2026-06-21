import os
import sys
from pydantic import BaseModel, Field
from typing import List

# Add the backend directory to sys.path so we can import the app
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.services.gemini import gemini_service

class LocalExamQuestion(BaseModel):
    question_text: str = Field(description="The text of the question")
    question_type: int = Field(description="Points/marks weight: 2, 5, or 10")
    reference_answer: str = Field(description="Strict model answer that would receive full marks")

class LocalExamList(BaseModel):
    questions: List[LocalExamQuestion]

def test():
    print("API Key:", gemini_service.api_key)
    prompt = "Create an exam based on standard biology. Give 1 question of 2 marks."
    system_instruction = "You are a teacher."
    try:
        res = gemini_service.generate_structured_json(
            prompt=prompt,
            response_schema=LocalExamList,
            system_instruction=system_instruction
        )
        print("Success:", res)
    except Exception as e:
        print("Failed with exception:", e)
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test()
