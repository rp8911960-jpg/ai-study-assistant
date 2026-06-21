from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.db.database import engine
from app.db.base import Base
from app.api.v1.router import api_router


# Initialize SQL Database Tables
try:
    Base.metadata.create_all(bind=engine)
    print("Database tables initialized successfully.")
except Exception as e:
    print(f"Error initializing database tables: {str(e)}")

app = FastAPI(
    title="AI Study Assistant API",
    description="RAG-powered student companion using Gemini and FAISS",
    version="1.0.0"
)

# Enable CORS for frontend API calls
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this to React app's host URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add routes
app.include_router(api_router, prefix="/api/v1")

@app.get("/api/v1/test-gemini")
def test_gemini_endpoint():
    import traceback
    from pydantic import BaseModel, Field
    from typing import List
    from app.services.gemini import gemini_service

    class LocalExamQuestion(BaseModel):
        question_text: str = Field(description="The text of the question")
        question_type: int = Field(description="Points/marks weight: 2, 5, or 10")
        reference_answer: str = Field(description="Strict model answer that would receive full marks")

    class LocalExamList(BaseModel):
        questions: List[LocalExamQuestion]

    try:
        res = gemini_service.generate_structured_json(
            prompt="Create an exam based on standard biology. Give 1 question of 2 marks.",
            response_schema=LocalExamList,
            system_instruction="You are a teacher."
        )
        return {"status": "success", "result": str(res)}
    except Exception as err:
        return {
            "status": "failed",
            "error_class": err.__class__.__name__,
            "error_msg": str(err),
            "traceback": traceback.format_exc()
        }

@app.get("/api/v1/debug-exam/{doc_id}")
def debug_exam_endpoint(doc_id: str):
    import traceback
    from sqlalchemy.orm import Session
    from app.db.database import get_db
    from app.models.document import DB_Document
    from app.services.gemini import gemini_service
    from app.api.v1.endpoints.study import get_combined_context
    from pydantic import BaseModel, Field
    from typing import List

    class LocalExamQuestion(BaseModel):
        question_text: str = Field(description="The text of the question")
        question_type: int = Field(description="Points/marks weight: 2, 5, or 10")
        reference_answer: str = Field(description="Strict model answer that would receive full marks")

    class LocalExamList(BaseModel):
        questions: List[LocalExamQuestion]

    db = next(get_db())
    
    try:
        doc = db.query(DB_Document).filter(DB_Document.id == doc_id).first()
        if not doc:
            return {"status": "error", "message": f"Document {doc_id} not found in DB"}
            
        combined_text = get_combined_context(doc_id, max_chars=60000)
        
        system_instruction = (
            "You are an academic examination committee member setting a formal university test.\n"
            "Generate questions with model reference answers directly from the provided text.\n"
            "Each type of question must follow these rules:\n"
            "- 2-mark questions: Core definition, formula, or fact (1-2 sentences answer).\n"
            "- 5-mark questions: Explanatory, comparative, or listing concepts (1-2 paragraphs answer).\n"
            "- 10-mark questions: Elaborate essay, complete derivation, process workflow, or architecture description (comprehensive, detailed answer)."
        )

        prompt = (
            f"Create an exam based on the text below with exactly:\n"
            f"- 2 questions of 2-mark weight\n"
            f"- 2 questions of 5-mark weight\n"
            f"- 1 questions of 10-mark weight\n\n"
            f"Provide a rigorous model reference answer for each question.\n\n"
            f"Text:\n{combined_text}"
        )

        res = gemini_service.generate_structured_json(
            prompt=prompt,
            response_schema=LocalExamList,
            system_instruction=system_instruction
        )
        return {"status": "success", "result": str(res)}
    except Exception as err:
        return {
            "status": "failed",
            "error_class": err.__class__.__name__,
            "error_msg": str(err),
            "traceback": traceback.format_exc()
        }

@app.get("/")
def read_root():
    return {
        "status": "online",
        "message": "Welcome to the AI Study Assistant API. API endpoints are at /api/v1."
    }
