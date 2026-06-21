from pydantic import BaseModel
from typing import List, Optional

class ExamGenerateRequest(BaseModel):
    num_2_mark: int = 2
    num_5_mark: int = 2
    num_10_mark: int = 1

class ExamQuestionSchema(BaseModel):
    id: int
    question_text: str
    question_type: int  # 2, 5, 10

class ExamSessionResponse(BaseModel):
    session_id: str
    document_id: str
    is_graded: bool
    questions: List[ExamQuestionSchema]

class ExamAnswerSubmission(BaseModel):
    question_id: int
    student_answer: str

class ExamSubmitRequest(BaseModel):
    answers: List[ExamAnswerSubmission]

class ExamQuestionGraded(BaseModel):
    id: int
    question_text: str
    question_type: int
    topic: Optional[str] = None
    student_answer: Optional[str] = None
    reference_answer: str
    marks_obtained: float
    feedback: str

class ExamEvaluationResponse(BaseModel):
    session_id: str
    max_score: float
    score: float
    is_graded: bool
    questions: List[ExamQuestionGraded]
