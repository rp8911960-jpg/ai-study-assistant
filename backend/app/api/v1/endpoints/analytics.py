from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
import pytz

from app.db.database import get_db
from app.models.user import User
from app.models.activity import UserActivity
from app.models.exam import ExamSession, ExamQuestion
from app.api.deps import get_current_user
from app.schemas.analytics import (
    AnalyticsDashboardResponse,
    DailyActivity,
    ExamScore,
    WeakTopic
)

router = APIRouter()

@router.get("/dashboard", response_model=AnalyticsDashboardResponse)
def get_analytics_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Total Study Sessions
    total_study_sessions = db.query(UserActivity).filter(UserActivity.user_id == current_user.id).count()

    # 2. Daily Activity (Last 30 days)
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    
    # SQLite compatible date grouping
    # For cross-DB compatibility (SQLite vs Postgres), we process dates in Python if needed, 
    # but since SQLAlchemy handles func.date() mostly well:
    activities = db.query(
        func.date(UserActivity.created_at).label('date'),
        func.count(UserActivity.id).label('count')
    ).filter(
        UserActivity.user_id == current_user.id,
        UserActivity.created_at >= thirty_days_ago
    ).group_by(func.date(UserActivity.created_at)).all()
    
    daily_activity = [
        DailyActivity(date=str(a.date), count=a.count) for a in activities
    ]

    # Calculate Streak
    # Fetch all distinct dates of activity
    all_dates = db.query(func.date(UserActivity.created_at)).filter(
        UserActivity.user_id == current_user.id
    ).distinct().order_by(func.date(UserActivity.created_at).desc()).all()
    
    date_strings = [str(d[0]) for d in all_dates]
    
    current_streak = 0
    today_str = datetime.utcnow().date().isoformat()
    yesterday_str = (datetime.utcnow() - timedelta(days=1)).date().isoformat()
    
    if date_strings:
        check_date = today_str
        if date_strings[0] == today_str:
            current_streak += 1
            idx = 1
            check_date = yesterday_str
        elif date_strings[0] == yesterday_str:
            current_streak += 1
            idx = 1
            check_date = (datetime.utcnow() - timedelta(days=2)).date().isoformat()
        else:
            idx = 0 # No streak
            
        # Continue counting backwards
        while idx < len(date_strings) and date_strings[idx] == check_date:
            current_streak += 1
            check_date = (datetime.strptime(check_date, "%Y-%m-%d") - timedelta(days=1)).date().isoformat()
            idx += 1

    # 3. Exam Performance
    exams = db.query(ExamSession).filter(
        ExamSession.user_id == current_user.id,
        ExamSession.is_graded == "true"
    ).order_by(ExamSession.created_at.asc()).all()

    recent_exams = []
    total_percentage = 0.0
    valid_exams_count = 0
    
    for exam in exams:
        if exam.max_score > 0:
            pct = (exam.score / exam.max_score) * 100
            total_percentage += pct
            valid_exams_count += 1
            recent_exams.append(
                ExamScore(
                    date=exam.created_at.date().isoformat(),
                    score=exam.score,
                    max_score=exam.max_score,
                    percentage=round(pct, 2)
                )
            )
            
    average_exam_score = round(total_percentage / valid_exams_count, 2) if valid_exams_count > 0 else 0.0

    # 4. Weak Topics
    # Find questions where student scored < 60%
    weak_questions = db.query(ExamQuestion).join(ExamSession).filter(
        ExamSession.user_id == current_user.id,
        ExamSession.is_graded == "true",
        ExamQuestion.topic.isnot(None)
    ).all()

    topic_stats = {}
    for q in weak_questions:
        if q.question_type > 0:
            pct = q.marks_obtained / q.question_type
            if pct < 0.6: # Less than 60% is weak
                topic = q.topic.lower().strip()
                if topic not in topic_stats:
                    topic_stats[topic] = {"count": 0, "total_pct": 0}
                topic_stats[topic]["count"] += 1
                topic_stats[topic]["total_pct"] += pct

    weak_topics = []
    for topic, stats in topic_stats.items():
        weak_topics.append(
            WeakTopic(
                topic=topic.title(),
                count=stats["count"],
                average_score=round((stats["total_pct"] / stats["count"]) * 100, 2)
            )
        )
    
    # Sort by count descending, then by average_score ascending
    weak_topics.sort(key=lambda x: (-x.count, x.average_score))
    weak_topics = weak_topics[:10] # Top 10 weak topics

    return AnalyticsDashboardResponse(
        total_study_sessions=total_study_sessions,
        current_streak=current_streak,
        average_exam_score=average_exam_score,
        daily_activity=daily_activity,
        recent_exams=recent_exams,
        weak_topics=weak_topics
    )
