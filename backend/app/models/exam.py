import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Float
from sqlalchemy.orm import relationship
from app.db.database import Base

class ExamSession(Base):
    __tablename__ = "exam_sessions"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    document_id = Column(String, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    max_score = Column(Float, default=0.0)
    score = Column(Float, default=0.0)
    is_graded = Column(String, default="false")  # "true" or "false"

    owner = relationship("User", back_populates="exam_sessions")
    questions = relationship("ExamQuestion", back_populates="session", cascade="all, delete-orphan")

class ExamQuestion(Base):
    __tablename__ = "exam_questions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    session_id = Column(String, ForeignKey("exam_sessions.id", ondelete="CASCADE"), nullable=False)
    question_text = Column(Text, nullable=False)
    question_type = Column(Integer, nullable=False)  # 2, 5, or 10 marks
    reference_answer = Column(Text, nullable=False)
    topic = Column(String, nullable=True)
    student_answer = Column(Text, nullable=True)
    marks_obtained = Column(Float, default=0.0)
    feedback = Column(Text, nullable=True)

    session = relationship("ExamSession", back_populates="questions")
