import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.db.database import Base

class UserActivity(Base):
    __tablename__ = "user_activities"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    action_type = Column(String, nullable=False, index=True) # e.g. 'chat', 'summary', 'mcq', 'viva', 'exam_taken'
    created_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)

    user = relationship("User")
