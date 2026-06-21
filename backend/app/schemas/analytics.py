from pydantic import BaseModel
from typing import List, Dict, Optional

class DailyActivity(BaseModel):
    date: str
    count: int

class ExamScore(BaseModel):
    date: str
    score: float
    max_score: float
    percentage: float

class WeakTopic(BaseModel):
    topic: str
    count: int
    average_score: float

class AnalyticsDashboardResponse(BaseModel):
    total_study_sessions: int
    current_streak: int
    average_exam_score: float
    daily_activity: List[DailyActivity]
    recent_exams: List[ExamScore]
    weak_topics: List[WeakTopic]
