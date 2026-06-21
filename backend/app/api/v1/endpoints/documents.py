import os
import uuid
import shutil
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.document import DB_Document
from app.models.user import User
from app.api.deps import get_current_user
from app.schemas.document import DocumentResponse, DocumentList
from app.services.pdf_processor import PDFProcessor
from app.services.gemini import gemini_service
from app.db.vector_store import vector_store
from app.core.config import settings

router = APIRouter()

def process_document_background(doc_id: str, file_path: str, db_session_factory):
    """
    Background task to process PDF, create chunks, generate embeddings,
    and build FAISS vector index.
    """
    db = db_session_factory()
    db_doc = db.query(DB_Document).filter(DB_Document.id == doc_id).first()
    if not db_doc:
        db.close()
        return
        
    try:
        # 1. Extract Pages
        pages_content = PDFProcessor.extract_text_from_pdf(file_path)
        db_doc.total_pages = len(pages_content)
        db.commit()
        
        # 2. Chunk Pages
        chunks = PDFProcessor.chunk_text(pages_content)
        db_doc.chunk_count = len(chunks)
        db.commit()
        
        if not chunks:
            raise ValueError("No readable text found in PDF.")
            
        # 3. Generate Embeddings (in batches to handle large documents safely)
        texts = [c["text"] for c in chunks]
        embeddings = []
        batch_size = 50
        
        for i in range(0, len(texts), batch_size):
            batch_texts = texts[i:i+batch_size]
            batch_embeddings = gemini_service.get_embeddings(batch_texts)
            embeddings.extend(batch_embeddings)
            
        # 4. Save to FAISS vector database
        vector_store.create_index(doc_id, chunks, embeddings)
        
        # 5. Mark as Completed
        db_doc.status = "completed"
        db.commit()
    except Exception as e:
        db_doc.status = "failed"
        db.commit()
        print(f"Failed to process document {doc_id}: {str(e)}")
    finally:
        db.close()

@router.post("/upload", response_model=DocumentResponse)
async def upload_pdf(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
        
    doc_id = str(uuid.uuid4())
    safe_filename = "".join(c for c in file.filename if c.isalnum() or c in "._- ").strip()
    file_path = os.path.join(settings.UPLOAD_DIR, f"{doc_id}_{safe_filename}")
    
    try:
        # Save upload locally
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Create record in SQLite DB
        db_doc = DB_Document(
            id=doc_id,
            user_id=current_user.id,
            filename=file.filename,
            filepath=file_path,
            status="processing"
        )
        db.add(db_doc)
        db.commit()
        db.refresh(db_doc)
        
        # Queue processing in background
        from app.db.database import SessionLocal
        background_tasks.add_task(
            process_document_background, 
            doc_id, 
            file_path, 
            SessionLocal
        )
        
        return db_doc
    except Exception as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Failed to initialize file: {str(e)}")

@router.get("/", response_model=DocumentList)
def list_documents(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    documents = db.query(DB_Document).filter(DB_Document.user_id == current_user.id).order_by(DB_Document.created_at.desc()).all()
    return {"documents": documents}

@router.get("/{doc_id}", response_model=DocumentResponse)
def get_document(doc_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    doc = db.query(DB_Document).filter(DB_Document.id == doc_id, DB_Document.user_id == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    return doc

@router.delete("/{doc_id}")
def delete_document(doc_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    doc = db.query(DB_Document).filter(DB_Document.id == doc_id, DB_Document.user_id == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
        
    # Delete from SQL
    db.delete(doc)
    db.commit()
    
    # Delete files
    if os.path.exists(doc.filepath):
        os.remove(doc.filepath)
        
    # Delete FAISS indices
    vector_store.delete_index(doc_id)
    
    return {"message": "Document and indexes deleted successfully."}
