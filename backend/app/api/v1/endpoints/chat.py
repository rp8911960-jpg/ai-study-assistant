from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.document import DB_Document
from app.models.user import User
from app.models.activity import UserActivity
from app.api.deps import get_current_user
from app.schemas.chat import ChatRequest, ChatResponse
from app.services.rag import rag_orchestrator

router = APIRouter()

@router.post("/{doc_id}", response_model=ChatResponse)
def chat_with_document(
    doc_id: str,
    payload: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Check document status
    doc = db.query(DB_Document).filter(DB_Document.id == doc_id, DB_Document.user_id == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
        
    if doc.status != "completed":
        raise HTTPException(
            status_code=400, 
            detail=f"Document is currently in '{doc.status}' state. Please wait until processing finishes."
        )
        
    try:
        response_data = rag_orchestrator.answer_question(
            document_id=doc_id,
            query=payload.message,
            history=payload.history
        )
        
        # Log Activity
        activity = UserActivity(user_id=current_user.id, action_type="chat")
        db.add(activity)
        db.commit()
        
        return response_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{doc_id}/stream")
def chat_with_document_stream(
    doc_id: str,
    payload: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Check document status
    doc = db.query(DB_Document).filter(DB_Document.id == doc_id, DB_Document.user_id == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
        
    if doc.status != "completed":
        raise HTTPException(
            status_code=400, 
            detail=f"Document is currently in '{doc.status}' state. Please wait until processing finishes."
        )
        
    try:
        # Log Activity
        activity = UserActivity(user_id=current_user.id, action_type="chat_stream")
        db.add(activity)
        db.commit()

        return StreamingResponse(
            rag_orchestrator.answer_question_stream(
                document_id=doc_id,
                query=payload.message,
                history=payload.history
            ),
            media_type="text/event-stream"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
