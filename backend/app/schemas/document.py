from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List

class DocumentBase(BaseModel):
    filename: str

class DocumentCreate(DocumentBase):
    id: str
    filepath: str

class DocumentResponse(DocumentBase):
    id: str
    created_at: datetime
    status: str
    total_pages: Optional[int] = None
    chunk_count: Optional[int] = None

    class Config:
        from_attributes = True

class DocumentList(BaseModel):
    documents: List[DocumentResponse]
