from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.document import DB_Document
from app.models.user import User
from app.models.activity import UserActivity
from app.api.deps import get_current_user
from app.db.vector_store import vector_store
from app.services.gemini import gemini_service
from app.schemas.study import (
    SummaryResponse, 
    MCQGenerationRequest, 
    MCQListResponse, 
    VivaGenerationRequest, 
    VivaListResponse
)

router = APIRouter()

def get_combined_context(doc_id: str, max_chars: int = 60000) -> str:
    """Helper to load all document text chunks and combine them within a reasonable token budget."""
    chunks = vector_store.get_all_chunks(doc_id)
    if not chunks:
        raise HTTPException(
            status_code=400, 
            detail="No document text content available. Has the document been indexed?"
        )
    
    combined_text = ""
    for chunk in chunks:
        combined_text += f"{chunk.get('text')}\n"
        if len(combined_text) >= max_chars:
            # Safely truncate to prevent prompt overflow
            combined_text = combined_text[:max_chars]
            break
    return combined_text

@router.post("/{doc_id}/summary", response_model=SummaryResponse)
def generate_summary(
    doc_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    doc = db.query(DB_Document).filter(DB_Document.id == doc_id, DB_Document.user_id == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
        
    if doc.status != "completed":
        raise HTTPException(status_code=400, detail="Document indexing is still in progress.")
        
    combined_text = get_combined_context(doc_id, max_chars=80000)
    
    system_instruction = (
        "You are an expert educational researcher and academic writer. "
        "Your task is to analyze the provided study material and generate a structured overview, "
        "key takeaways, and a breakdown of detailed chapters/modules."
    )
    
    prompt = (
        f"Generate a hierarchical academic summary based strictly on the following text content.\n\n"
        f"Text:\n{combined_text}"
    )
    
    try:
        summary_data = gemini_service.generate_structured_json(
            prompt=prompt,
            response_schema=SummaryResponse,
            system_instruction=system_instruction
        )
        
        # Log Activity
        activity = UserActivity(user_id=current_user.id, action_type="summary")
        db.add(activity)
        db.commit()
        
        return summary_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate summary: {str(e)}")

@router.post("/{doc_id}/mcq", response_model=MCQListResponse)
def generate_mcqs(
    doc_id: str,
    payload: MCQGenerationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    doc = db.query(DB_Document).filter(DB_Document.id == doc_id, DB_Document.user_id == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
        
    if doc.status != "completed":
        raise HTTPException(status_code=400, detail="Document indexing is still in progress.")
        
    combined_text = get_combined_context(doc_id, max_chars=60000)
    
    system_instruction = (
        "You are an expert college professor designing quizzes. "
        "Your task is to generate challenging Multiple-Choice Questions (MCQs) directly from the text. "
        "Ensure all options are distinct, one and only one option is correct (0-indexed), "
        "and write a helpful, detailed explanation of why the correct option is right and others are wrong."
    )
    
    prompt = (
        f"Generate exactly {payload.num_questions} MCQs with a difficulty level of '{payload.difficulty}' "
        f"from the following study material.\n\n"
        f"Text:\n{combined_text}"
    )
    
    try:
        mcq_data = gemini_service.generate_structured_json(
            prompt=prompt,
            response_schema=MCQListResponse,
            system_instruction=system_instruction
        )
        
        # Log Activity
        activity = UserActivity(user_id=current_user.id, action_type="mcq")
        db.add(activity)
        db.commit()
        
        return mcq_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate MCQs: {str(e)}")

@router.post("/{doc_id}/viva", response_model=VivaListResponse)
def generate_viva_questions(
    doc_id: str,
    payload: VivaGenerationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    doc = db.query(DB_Document).filter(DB_Document.id == doc_id, DB_Document.user_id == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
        
    if doc.status != "completed":
        raise HTTPException(status_code=400, detail="Document indexing is still in progress.")
        
    combined_text = get_combined_context(doc_id, max_chars=60000)
    
    system_instruction = (
        "You are a strict technical viva examiner conducting an oral exam. "
        "Your goal is to test the student's deep conceptual understanding of the text. "
        "Generate realistic viva/interview questions, alongside rigorous model answers and optional explanations."
    )
    
    prompt = (
        f"Generate exactly {payload.num_questions} viva prep questions and corresponding answers "
        f"from the following text.\n\n"
        f"Text:\n{combined_text}"
    )
    
    try:
        viva_data = gemini_service.generate_structured_json(
            prompt=prompt,
            response_schema=VivaListResponse,
            system_instruction=system_instruction
        )
        
        # Log Activity
        activity = UserActivity(user_id=current_user.id, action_type="viva")
        db.add(activity)
        db.commit()
        
        return viva_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate Viva questions: {str(e)}")
