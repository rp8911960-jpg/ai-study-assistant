import React, { useState, useEffect } from 'react';
import { useDocuments } from '../context/DocumentContext';
import api from '../services/api';
import { FileQuestion, Clock, CheckCircle2, ChevronRight, PenTool, Award, AlertCircle } from 'lucide-react';

export default function ExamArena() {
  const { selectedDocument } = useDocuments();
  const [examSession, setExamSession] = useState(null);
  
  // Generation parameters
  const [params, setParams] = useState({ q2: 2, q5: 2, q10: 1 });
  const [studentAnswers, setStudentAnswers] = useState({}); // { question_id: "answer..." }

  // Timer state
  const [timeLeft, setTimeLeft] = useState(0); // in seconds
  const [timerActive, setTimerActive] = useState(false);

  // Loading & Error states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Graded report state
  const [gradedResult, setGradedResult] = useState(null);

  // Timer Tick Effect
  useEffect(() => {
    let interval = null;
    if (timerActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && timerActive) {
      setTimerActive(false);
      // Auto submit
      handleExamSubmit();
    }
    return () => clearInterval(interval);
  }, [timerActive, timeLeft]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartExam = async () => {
    setLoading(true);
    setError(null);
    setGradedResult(null);
    setStudentAnswers({});
    try {
      const session = await api.generateExam(selectedDocument.id, params.q2, params.q5, params.q10);
      setExamSession(session);
      
      // Calculate exam duration: 2 mins per 2-mark, 6 mins per 5-mark, 12 mins per 10-mark
      const duration = (params.q2 * 120) + (params.q5 * 360) + (params.q10 * 720);
      setTimeLeft(duration);
      setTimerActive(true);
    } catch (err) {
      console.error(err);
      window.lastError = err.response ? err.response.data : err.message;
      setError("Failed to generate exam questions. Check your Gemini API configurations.");
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (qId, val) => {
    setStudentAnswers((prev) => ({
      ...prev,
      [qId]: val,
    }));
  };

  const handleExamSubmit = async () => {
    if (!examSession) return;
    setTimerActive(false);
    setLoading(true);
    setError(null);

    // Map responses to backend schema: { question_id: int, student_answer: str }
    const answersList = examSession.questions.map((q) => ({
      question_id: q.id,
      student_answer: studentAnswers[q.id] || "",
    }));

    try {
      const evaluation = await api.submitExam(examSession.session_id, answersList);
      setGradedResult(evaluation);
    } catch (err) {
      console.error(err);
      setError("Failed to grade your exam responses.");
    } finally {
      setLoading(false);
    }
  };

  if (!selectedDocument) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
        <FileQuestion size={64} style={{ opacity: 0.2, marginBottom: '1.5rem' }} />
        <h2 style={{ color: 'var(--text-main)', marginBottom: '0.5rem' }}>No Document Selected</h2>
        <p>Please select a document from the Dashboard or Sidebar library first.</p>
      </div>
    );
  }

  return (
    <div className="study-content-container" style={{ maxWidth: '900px', margin: '0 auto', width: '100%' }}>
      {/* 1. Configuration screen */}
      {!examSession && !gradedResult && !loading && (
        <div className="glass-panel" style={{ padding: '2.5rem', textAlign: 'center' }}>
          <PenTool size={48} style={{ color: 'var(--color-primary)', opacity: 0.8, marginBottom: '1rem', margin: '0 auto 1.5rem' }} />
          <h2 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Exam Arena</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
            Generate written mock tests. Once finished, Gemini evaluates your answers against reference responses and scores your submission.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
            <div style={{ width: '120px' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>2-Mark Qs</label>
              <input 
                type="number" 
                min="0" 
                max="5"
                className="input-field" 
                value={params.q2}
                onChange={(e) => setParams({...params, q2: parseInt(e.target.value) || 0})}
              />
            </div>
            <div style={{ width: '120px' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>5-Mark Qs</label>
              <input 
                type="number" 
                min="0" 
                max="5"
                className="input-field" 
                value={params.q5}
                onChange={(e) => setParams({...params, q5: parseInt(e.target.value) || 0})}
              />
            </div>
            <div style={{ width: '120px' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>10-Mark Qs</label>
              <input 
                type="number" 
                min="0" 
                max="3"
                className="input-field" 
                value={params.q10}
                onChange={(e) => setParams({...params, q10: parseInt(e.target.value) || 0})}
              />
            </div>
          </div>

          {params.q2 === 0 && params.q5 === 0 && params.q10 === 0 ? (
            <div style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              Select at least one question weight to start!
            </div>
          ) : null}

          <button 
            className="btn btn-primary" 
            disabled={params.q2 === 0 && params.q5 === 0 && params.q10 === 0}
            onClick={handleStartExam}
          >
            Generate & Start Exam <ChevronRight size={18} />
          </button>
        </div>
      )}

      {/* 2. Loading State */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '350px', gap: '1rem' }}>
          <div className="loader" style={{ width: '40px', height: '40px' }}></div>
          <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>
            {examSession ? "AI is reviewing your submission and scoring answers..." : "Generating examination questions based on material..."}
          </p>
        </div>
      )}

      {/* 3. Error Feedback */}
      {error && !loading && (
        <div style={{ color: '#ef4444', display: 'flex', gap: '0.5rem', fontSize: '0.9rem', background: 'rgba(239, 68, 68, 0.08)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.15)', marginBottom: '1.5rem' }}>
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <div>
            <p style={{ fontWeight: '600' }}>Error occurred</p>
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* 4. Active Exam Form */}
      {examSession && !gradedResult && !loading && (
        <div>
          {/* Top exam status bar */}
          <div className="glass-panel" style={{ padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', position: 'sticky', top: 0, zIndex: 10 }}>
            <div>
              <h3 style={{ fontSize: '1.1rem' }}>Examination Session</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Document: {selectedDocument.filename}</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(244, 63, 94, 0.12)', border: '1px solid rgba(244, 63, 94, 0.2)', padding: '0.5rem 1rem', borderRadius: '8px', color: 'var(--color-accent)' }}>
              <Clock size={16} />
              <span style={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: '1.1rem' }}>{formatTime(timeLeft)}</span>
            </div>
          </div>

          {/* Exam Questions list */}
          {examSession.questions.map((q, idx) => (
            <div key={q.id} className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <span className={`exam-badge m${q.question_type}`}>
                  {q.question_type} Marks
                </span>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Question {idx + 1}</span>
              </div>
              <h4 style={{ fontSize: '1.1rem', marginBottom: '1rem', lineHeight: '1.4' }}>{q.question_text}</h4>
              <textarea
                className="input-field"
                placeholder="Write your detailed answer here..."
                rows="6"
                style={{ resize: 'vertical', background: 'rgba(0,0,0,0.3)' }}
                value={studentAnswers[q.id] || ""}
                onChange={(e) => handleAnswerChange(q.id, e.target.value)}
              />
            </div>
          ))}

          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1.5rem' }}>
            <button className="btn btn-secondary" onClick={() => { if(window.confirm("Abort exam? Progress will be lost.")) { setExamSession(null); } }}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleExamSubmit}>
              Submit Exam for Grading
            </button>
          </div>
        </div>
      )}

      {/* 5. Graded scorecard report view */}
      {gradedResult && !loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Header Score Info Card */}
          <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', borderLeft: '5px solid var(--color-primary)' }}>
            <Award size={48} style={{ color: 'var(--color-primary)', marginBottom: '1rem', margin: '0 auto 1rem' }} />
            <h2 style={{ fontSize: '1.5rem' }}>Exam Graded</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Evaluation results generated by Gemini based on textbook index.</p>
            <div style={{ margin: '1.5rem 0' }}>
              <span style={{ fontSize: '2.5rem', fontWeight: 'bold' }} className="gradient-text">
                {gradedResult.score.toFixed(1)}
              </span>
              <span style={{ fontSize: '1.25rem', color: 'var(--text-muted)' }}>
                {' '}/ {gradedResult.max_score.toFixed(1)} Points
              </span>
            </div>
            <div style={{ height: '6px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '10px', overflow: 'hidden', maxWidth: '300px', margin: '0 auto 1.5rem' }}>
              <div style={{ width: `${(gradedResult.score / gradedResult.max_score) * 100}%`, height: '100%', background: 'linear-gradient(90deg, var(--color-primary), var(--color-secondary))' }}></div>
            </div>
            <button className="btn btn-secondary" onClick={() => { setExamSession(null); setGradedResult(null); }}>
              Take Another Exam
            </button>
          </div>

          {/* Detailed Question Review */}
          <h3 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem' }}>
            <CheckCircle2 size={18} style={{ color: 'var(--color-primary)' }} /> Question Review
          </h3>

          {gradedResult.questions.map((q, idx) => (
            <div key={q.id} className="glass-panel" style={{ padding: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.75rem' }}>
                <div>
                  <span className={`exam-badge m${q.question_type}`} style={{ marginRight: '0.5rem' }}>
                    {q.question_type} Marks
                  </span>
                  <span style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>Question {idx + 1}</span>
                </div>
                <div style={{ fontWeight: 'bold', color: q.marks_obtained > (q.question_type * 0.7) ? '#10b981' : '#f59e0b' }}>
                  Score: {q.marks_obtained.toFixed(1)} / {q.question_type.toFixed(1)}
                </div>
              </div>

              <h4 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', lineHeight: '1.4' }}>{q.question_text}</h4>

              {/* Student answer card */}
              <div style={{ marginBottom: '1rem' }}>
                <p style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 'bold', marginBottom: '0.25rem' }}>Your Response</p>
                <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-light)', padding: '1rem', borderRadius: '8px', fontSize: '0.95rem', fontStyle: q.student_answer ? 'normal' : 'italic', color: q.student_answer ? 'var(--text-main)' : 'var(--text-muted)' }}>
                  {q.student_answer || "No response was written."}
                </div>
              </div>

              {/* Reference model answer card */}
              <div style={{ marginBottom: '1rem' }}>
                <p style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-secondary)', fontWeight: 'bold', marginBottom: '0.25rem' }}>Model Reference Answer</p>
                <div style={{ background: 'rgba(59, 130, 246, 0.03)', border: '1px solid rgba(59, 130, 246, 0.15)', padding: '1rem', borderRadius: '8px', fontSize: '0.95rem', color: 'var(--text-muted)' }}>
                  {q.reference_answer}
                </div>
              </div>

              {/* Evaluator Feedback card */}
              <div>
                <p style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-primary)', fontWeight: 'bold', marginBottom: '0.25rem' }}>AI Assessor Feedback</p>
                <div style={{ background: 'rgba(139, 92, 246, 0.03)', border: '1px solid rgba(139, 92, 246, 0.15)', padding: '1rem', borderRadius: '8px', fontSize: '0.95rem', lineHeight: '1.5' }}>
                  {q.feedback}
                </div>
              </div>

            </div>
          ))}

          <button className="btn btn-primary" onClick={() => { setExamSession(null); setGradedResult(null); }} style={{ alignSelf: 'center', marginTop: '1rem' }}>
            Back to Config
          </button>
        </div>
      )}
    </div>
  );
}
