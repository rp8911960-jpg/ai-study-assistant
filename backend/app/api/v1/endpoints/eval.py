import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import List

from app.db.database import get_db
from app.models.document import DB_Document
from app.models.exam import ExamSession, ExamQuestion
from app.models.user import User
from app.models.activity import UserActivity
from app.api.deps import get_current_user
from app.db.vector_store import vector_store
from app.services.gemini import gemini_service
from app.api.v1.endpoints.study import get_combined_context
from app.schemas.eval import (
    ExamGenerateRequest,
    ExamSessionResponse,
    ExamQuestionSchema,
    ExamSubmitRequest,
    ExamEvaluationResponse,
    ExamQuestionGraded
)

router = APIRouter()

# Schema for structured generation from Gemini
class LocalExamQuestion(BaseModel):
    question_text: str = Field(description="The text of the question")
    question_type: int = Field(description="Points/marks weight: 2, 5, or 10")
    reference_answer: str = Field(description="Strict model answer that would receive full marks")

class LocalExamList(BaseModel):
    questions: List[LocalExamQuestion]

# Schema for answer grading
class GradedQuestion(BaseModel):
    marks_obtained: float = Field(description="Score awarded, strict float from 0.0 to maximum marks")
    feedback: str = Field(description="Constructive critique of the answer highlighting gaps or errors")
    topic: str = Field(description="A 1-3 word specific topic/concept being tested")


@router.post("/{doc_id}/exam", response_model=ExamSessionResponse)
def generate_exam(
    doc_id: str,
    payload: ExamGenerateRequest,
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
        "You are an academic examination committee member setting a formal university test.\n"
        "Generate questions with model reference answers directly from the provided text.\n"
        "Each type of question must follow these rules:\n"
        "- 2-mark questions: Core definition, formula, or fact (1-2 sentences answer).\n"
        "- 5-mark questions: Explanatory, comparative, or listing concepts (1-2 paragraphs answer).\n"
        "- 10-mark questions: Elaborate essay, complete derivation, process workflow, or architecture description (comprehensive, detailed answer)."
    )

    prompt = (
        f"Create an exam based on the text below with exactly:\n"
        f"- {payload.num_2_mark} questions of 2-mark weight\n"
        f"- {payload.num_5_mark} questions of 5-mark weight\n"
        f"- {payload.num_10_mark} questions of 10-mark weight\n\n"
        f"Provide a rigorous model reference answer for each question.\n\n"
        f"Text:\n{combined_text}"
    )

    try:
        exam_data = gemini_service.generate_structured_json(
            prompt=prompt,
            response_schema=LocalExamList,
            system_instruction=system_instruction
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate exam questions: {str(e)}")

    # Calculate max score
    max_score = (payload.num_2_mark * 2) + (payload.num_5_mark * 5) + (payload.num_10_mark * 10)

    # Save ExamSession in DB
    session_id = str(uuid.uuid4())
    db_session = ExamSession(
        id=session_id,
        user_id=current_user.id,
        document_id=doc_id,
        max_score=float(max_score),
        score=0.0,
        is_graded="false"
    )
    db.add(db_session)
    db.commit()

    # Save ExamQuestions in DB
    created_questions = []
    for item in exam_data.questions:
        db_question = ExamQuestion(
            session_id=session_id,
            question_text=item.question_text,
            question_type=item.question_type,
            reference_answer=item.reference_answer
        )
        db.add(db_question)
        db.commit()
        db.refresh(db_question)
        
        # Add to response schema (do NOT send reference answer in generation payload)
        created_questions.append(
            ExamQuestionSchema(
                id=db_question.id,
                question_text=db_question.question_text,
                question_type=db_question.question_type
            )
        )

    return ExamSessionResponse(
        session_id=session_id,
        document_id=doc_id,
        is_graded=False,
        questions=created_questions
    )


@router.post("/exam/{session_id}/submit", response_model=ExamEvaluationResponse)
def submit_and_evaluate_exam(
    session_id: str,
    payload: ExamSubmitRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    session = db.query(ExamSession).filter(ExamSession.id == session_id, ExamSession.user_id == current_user.id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Exam session not found.")
        
    if session.is_graded == "true":
        raise HTTPException(status_code=400, detail="This exam session has already been graded.")

    answers_dict = {ans.question_id: ans.student_answer for ans in payload.answers}
    total_score = 0.0

    questions_graded = []

    # Grade each question individually
    for q in session.questions:
        student_ans = answers_dict.get(q.id, "").strip()
        q.student_answer = student_ans

        if not student_ans:
            q.marks_obtained = 0.0
            q.feedback = "No answer was provided for this question."
            db.commit()
            
            questions_graded.append(
                ExamQuestionGraded(
                    id=q.id,
                    question_text=q.question_text,
                    question_type=q.question_type,
                    topic=q.topic,
                    student_answer="",
                    reference_answer=q.reference_answer,
                    marks_obtained=0.0,
                    feedback=q.feedback
                )
            )
            continue

        # Grade using Gemini
        system_instruction = (
            "You are an objective university professor grading a student's written response.\n"
            "Compare the student's answer with the provided model reference answer. Award marks based on conceptual correctness, depth, and inclusion of key points.\n"
            f"Maximum score for this question is {q.question_type} marks. Do not award more than this limit. "
            "Be strict but fair. Assign fractional scores (e.g. 1.5, 4.0) if applicable, and write short constructive feedback.\n"
            "Also identify the specific 1-3 word topic or concept that this question tests."
        )

        prompt = (
            f"Question: {q.question_text}\n"
            f"Weight: {q.question_type} marks\n\n"
            f"Model Reference Answer: {q.reference_answer}\n\n"
            f"Student's Submitted Answer: {student_ans}\n\n"
            f"Evaluate and output marks_obtained and feedback matching the schema."
        )

        try:
            grading_result = gemini_service.generate_structured_json(
                prompt=prompt,
                response_schema=GradedQuestion,
                system_instruction=system_instruction
            )
            # Clip score to bounds
            score = max(0.0, min(float(q.question_type), grading_result.marks_obtained))
            q.marks_obtained = score
            q.feedback = grading_result.feedback
            q.topic = grading_result.topic
        except Exception as e:
            # Fallback in case of API failure during grading
            q.marks_obtained = 0.0
            q.feedback = f"Grading API Error: {str(e)}. Defaulted to 0 marks."
            
        db.commit()
        total_score += q.marks_obtained

        questions_graded.append(
            ExamQuestionGraded(
                id=q.id,
                question_text=q.question_text,
                question_type=q.question_type,
                topic=q.topic,
                student_answer=q.student_answer,
                reference_answer=q.reference_answer,
                marks_obtained=q.marks_obtained,
                feedback=q.feedback
            )
        )

    # Complete grading status
    session.score = total_score
    session.is_graded = "true"
    
    # Log Activity
    activity = UserActivity(user_id=current_user.id, action_type="exam_taken")
    db.add(activity)
    db.commit()

    return ExamEvaluationResponse(
        session_id=session.id,
        max_score=session.max_score,
        score=total_score,
        is_graded=True,
        questions=questions_graded
    )


@router.get("/exam/{session_id}", response_model=ExamEvaluationResponse)
def get_exam_session_details(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    session = db.query(ExamSession).filter(ExamSession.id == session_id, ExamSession.user_id == current_user.id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Exam session not found.")

    is_graded_bool = (session.is_graded == "true")
    
    questions_graded = []
    for q in session.questions:
        questions_graded.append(
            ExamQuestionGraded(
                id=q.id,
                question_text=q.question_text,
                question_type=q.question_type,
                topic=q.topic,
                student_answer=q.student_answer,
                reference_answer=q.reference_answer if is_graded_bool else "", # Hide reference answer if not graded
                marks_obtained=q.marks_obtained if is_graded_bool else 0.0,
                feedback=q.feedback if is_graded_bool else ""
            )
        )

    return ExamEvaluationResponse(
        session_id=session.id,
        max_score=session.max_score,
        score=session.score if is_graded_bool else 0.0,
        is_graded=is_graded_bool,
        questions=questions_graded
    )
