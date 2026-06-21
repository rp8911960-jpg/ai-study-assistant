from fastapi import APIRouter
from app.api.v1.endpoints import auth, documents, chat, study, eval as evaluation, analytics

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(documents.router, prefix="/documents", tags=["Documents"])
api_router.include_router(chat.router, prefix="/chat", tags=["Chat & RAG Q&A"])
api_router.include_router(study.router, prefix="/study", tags=["Study Tools (Summaries, MCQs, Viva)"])
api_router.include_router(evaluation.router, prefix="/evaluation", tags=["Exam Mode"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])
