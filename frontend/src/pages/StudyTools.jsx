import React, { useState } from 'react';
import { useDocuments } from '../context/DocumentContext';
import api from '../services/api';
import { FileText, ClipboardList, BookOpen, Layers, Award, ShieldQuestion, HelpCircle, ArrowRight, ArrowLeft } from 'lucide-react';

export default function StudyTools() {
  const { selectedDocument } = useDocuments();
  const [activeSubTab, setActiveSubTab] = useState('summary'); // summary, mcq, viva
  
  // Loading states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Summary State
  const [summaryData, setSummaryData] = useState(null);

  // MCQ State
  const [mcqs, setMcqs] = useState([]);
  const [mcqConfig, setMcqConfig] = useState({ numQuestions: 5, difficulty: 'medium' });
  const [selectedAnswers, setSelectedAnswers] = useState({}); // { questionIdx: optionIdx }
  const [submittedMcq, setSubmittedMcq] = useState(false);

  // Viva State
  const [vivaList, setVivaList] = useState([]);
  const [vivaCount, setVivaCount] = useState(5);
  const [vivaIndex, setVivaIndex] = useState(0);
  const [cardFlipped, setCardFlipped] = useState(false);

  const handleFetchSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.generateSummary(selectedDocument.id);
      setSummaryData(data);
    } catch (err) {
      console.error(err);
      setError("Failed to generate summary. Make sure the API key is set.");
    } finally {
      setLoading(false);
    }
  };

  const handleFetchMCQs = async () => {
    setLoading(true);
    setError(null);
    setSelectedAnswers({});
    setSubmittedMcq(false);
    try {
      const data = await api.generateMCQs(
        selectedDocument.id,
        mcqConfig.numQuestions,
        mcqConfig.difficulty
      );
      setMcqs(data.questions || []);
    } catch (err) {
      console.error(err);
      setError("Failed to generate MCQs.");
    } finally {
      setLoading(false);
    }
  };

  const handleFetchViva = async () => {
    setLoading(true);
    setError(null);
    setCardFlipped(false);
    setVivaIndex(0);
    try {
      const data = await api.generateViva(selectedDocument.id, vivaCount);
      setVivaList(data.questions || []);
    } catch (err) {
      console.error(err);
      setError("Failed to generate Viva questions.");
    } finally {
      setLoading(false);
    }
  };

  const getScore = () => {
    let score = 0;
    mcqs.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.correct_option_index) {
        score++;
      }
    });
    return score;
  };

  if (!selectedDocument) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
        <BookOpen size={64} style={{ opacity: 0.2, marginBottom: '1.5rem' }} />
        <h2 style={{ color: 'var(--text-main)', marginBottom: '0.5rem' }}>No Document Selected</h2>
        <p>Please select a document from the Dashboard or Sidebar library first.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Sub tabs Selector */}
      <div className="glass-panel" style={{ padding: '0.5rem', display: 'flex', gap: '0.5rem', margin: '1.5rem' }}>
        <button 
          onClick={() => { setActiveSubTab('summary'); setError(null); }}
          className={`btn ${activeSubTab === 'summary' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ flex: 1, padding: '0.6rem' }}
        >
          <BookOpen size={16} /> Summary
        </button>
        <button 
          onClick={() => { setActiveSubTab('mcq'); setError(null); }}
          className={`btn ${activeSubTab === 'mcq' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ flex: 1, padding: '0.6rem' }}
        >
          <ClipboardList size={16} /> MCQ Quiz
        </button>
        <button 
          onClick={() => { setActiveSubTab('viva'); setError(null); }}
          className={`btn ${activeSubTab === 'viva' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ flex: 1, padding: '0.6rem' }}
        >
          <ShieldQuestion size={16} /> Viva Prep
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 1.5rem 1.5rem 1.5rem' }}>
        {error && (
          <div style={{ color: '#ef4444', fontSize: '0.85rem', background: 'rgba(239, 68, 68, 0.08)', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.15)', marginBottom: '1.5rem' }}>
            {error}
          </div>
        )}

        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '1rem' }}>
            <div className="loader" style={{ width: '40px', height: '40px' }}></div>
            <p style={{ color: 'var(--text-muted)' }}>Generating educational resources with Gemini... Please wait.</p>
          </div>
        )}

        {!loading && (
          <>
            {/* SUMMARY TAB VIEW */}
            {activeSubTab === 'summary' && (
              <div>
                {!summaryData ? (
                  <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
                    <BookOpen size={48} style={{ color: 'var(--color-primary)', opacity: 0.6, marginBottom: '1rem' }} />
                    <h3>Auto-Summarize Material</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem', maxWidth: '500px', margin: '0.5rem auto 1.5rem' }}>
                      Analyze the complete document vocabulary and generate structural highlights, overview summaries, and key takeaways.
                    </p>
                    <button className="btn btn-primary" onClick={handleFetchSummary}>
                      Generate Summary
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="glass-panel" style={{ padding: '2rem' }}>
                      <h1 style={{ marginBottom: '1rem', fontSize: '1.75rem' }}>{summaryData.title}</h1>
                      <p style={{ lineHeight: '1.7', fontSize: '1.05rem', color: 'var(--text-muted)', whiteSpace: 'pre-wrap' }}>{summaryData.overview}</p>
                    </div>

                    <div className="glass-panel" style={{ padding: '2rem' }}>
                      <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Award size={18} style={{ color: 'var(--color-primary)' }} /> Key Takeaways
                      </h2>
                      <ul style={{ listStyleType: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {summaryData.key_points.map((pt, i) => (
                          <li key={i} style={{ paddingLeft: '1.5rem', position: 'relative', lineHeight: '1.5' }}>
                            <span style={{ position: 'absolute', left: 0, color: 'var(--color-primary)', fontWeight: 'bold' }}>•</span>
                            {pt}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <h2 style={{ fontSize: '1.25rem', marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Layers size={18} style={{ color: 'var(--color-secondary)' }} /> Chapter Summaries
                    </h2>
                    
                    {summaryData.detailed_chapters.map((ch, i) => (
                      <div key={i} className="glass-panel" style={{ padding: '1.5rem' }}>
                        <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem', color: 'var(--color-primary)' }}>{ch.heading}</h3>
                        <p style={{ lineHeight: '1.6', color: 'var(--text-muted)', fontSize: '0.95rem' }}>{ch.content}</p>
                      </div>
                    ))}
                    <button className="btn btn-secondary" onClick={handleFetchSummary} style={{ alignSelf: 'center', marginTop: '1rem' }}>
                      Regenerate Summary
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* MCQ TAB VIEW */}
            {activeSubTab === 'mcq' && (
              <div>
                {mcqs.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
                    <ClipboardList size={48} style={{ color: 'var(--color-primary)', opacity: 0.6, marginBottom: '1rem' }} />
                    <h3>Practice Quizzes</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem', maxWidth: '500px', margin: '0.5rem auto 1.5rem' }}>
                      Test your knowledge by generating structured multiple choice questions based directly on the PDF.
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                      <div style={{ textAlign: 'left' }}>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Count</label>
                        <select 
                          className="input-field" 
                          value={mcqConfig.numQuestions}
                          onChange={(e) => setMcqConfig({...mcqConfig, numQuestions: parseInt(e.target.value)})}
                          style={{ width: '120px' }}
                        >
                          <option value="5">5 Qs</option>
                          <option value="10">10 Qs</option>
                          <option value="15">15 Qs</option>
                        </select>
                      </div>
                      <div style={{ textAlign: 'left' }}>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Difficulty</label>
                        <select 
                          className="input-field" 
                          value={mcqConfig.difficulty}
                          onChange={(e) => setMcqConfig({...mcqConfig, difficulty: e.target.value})}
                          style={{ width: '150px' }}
                        >
                          <option value="easy">Easy</option>
                          <option value="medium">Medium</option>
                          <option value="hard">Hard</option>
                        </select>
                      </div>
                    </div>
                    <button className="btn btn-primary" onClick={handleFetchMCQs}>
                      Generate Quiz
                    </button>
                  </div>
                ) : (
                  <div>
                    {/* Score Panel */}
                    {submittedMcq && (
                      <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center', marginBottom: '1.5rem', borderLeft: '4px solid var(--color-primary)' }}>
                        <h3 style={{ fontSize: '1.25rem' }}>Quiz Results</h3>
                        <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: '0.5rem 0' }} className="gradient-text">
                          {getScore()} / {mcqs.length} ({Math.round(getScore()/mcqs.length * 100)}%)
                        </p>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                          Review the explanations below to correct any conceptual gaps.
                        </p>
                      </div>
                    )}

                    {/* Quiz Questions */}
                    {mcqs.map((item, qIdx) => (
                      <div key={qIdx} className="glass-panel mcq-card">
                        <h4 style={{ fontSize: '1.05rem', marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}>
                          <span style={{ color: 'var(--color-primary)' }}>Q{qIdx + 1}.</span>
                          <span>{item.question}</span>
                        </h4>
                        
                        <div>
                          {item.options.map((opt, oIdx) => {
                            const isSelected = selectedAnswers[qIdx] === oIdx;
                            const isCorrectOpt = item.correct_option_index === oIdx;
                            
                            let optionClass = "";
                            if (isSelected) optionClass = "selected";
                            if (submittedMcq) {
                              if (isCorrectOpt) optionClass = "correct";
                              else if (isSelected) optionClass = "incorrect";
                            }

                            return (
                              <div 
                                key={oIdx} 
                                className={`mcq-option ${optionClass}`}
                                onClick={() => !submittedMcq && setSelectedAnswers({...selectedAnswers, [qIdx]: oIdx})}
                              >
                                <span style={{ 
                                  width: '24px', 
                                  height: '24px', 
                                  borderRadius: '50%', 
                                  border: '1px solid var(--border-light)', 
                                  marginRight: '0.75rem', 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'center',
                                  fontSize: '0.8rem',
                                  fontWeight: 'bold',
                                  background: isSelected ? 'var(--color-primary)' : 'rgba(0,0,0,0.2)'
                                }}>
                                  {String.fromCharCode(65 + oIdx)}
                                </span>
                                <span>{opt}</span>
                              </div>
                            );
                          })}
                        </div>

                        {submittedMcq && (
                          <div className="mcq-explanation">
                            <p style={{ fontWeight: '600', color: 'var(--text-main)', marginBottom: '0.25rem' }}>Explanation:</p>
                            <p>{item.explanation}</p>
                          </div>
                        )}
                      </div>
                    ))}

                    <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1.5rem' }}>
                      {!submittedMcq ? (
                        <button 
                          className="btn btn-primary" 
                          onClick={() => setSubmittedMcq(true)}
                          disabled={Object.keys(selectedAnswers).length < mcqs.length}
                        >
                          Submit Answers
                        </button>
                      ) : (
                        <button className="btn btn-secondary" onClick={handleFetchMCQs}>
                          Try Another Quiz
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* VIVA PREP TAB VIEW */}
            {activeSubTab === 'viva' && (
              <div>
                {vivaList.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
                    <ShieldQuestion size={48} style={{ color: 'var(--color-primary)', opacity: 0.6, marginBottom: '1rem' }} />
                    <h3>Viva Interview Prep</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem', maxWidth: '500px', margin: '0.5rem auto 1.5rem' }}>
                      Practice answering conceptual verbal queries. Flashcards feature question prompts and flip to reveal rigorous technical answers.
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                      <div style={{ textAlign: 'left' }}>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Number of cards</label>
                        <select 
                          className="input-field" 
                          value={vivaCount}
                          onChange={(e) => setVivaCount(parseInt(e.target.value))}
                          style={{ width: '120px' }}
                        >
                          <option value="5">5 Cards</option>
                          <option value="10">10 Cards</option>
                          <option value="15">15 Cards</option>
                        </select>
                      </div>
                    </div>
                    <button className="btn btn-primary" onClick={handleFetchViva}>
                      Generate Cards
                    </button>
                  </div>
                ) : (
                  <div>
                    {/* Progress indicator */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', maxWidth: '650px', margin: '0 auto', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                      <span>Card {vivaIndex + 1} of {vivaList.length}</span>
                      <span>Click card to flip</span>
                    </div>

                    {/* Flipping Flashcard */}
                    <div className="flashcard-wrapper" onClick={() => setCardFlipped(!cardFlipped)}>
                      <div className={`flashcard ${cardFlipped ? 'flipped' : ''}`}>
                        <div className="flashcard-front">
                          <HelpCircle size={36} style={{ color: 'var(--color-primary)', marginBottom: '1.5rem' }} />
                          <h3 style={{ fontSize: '1.35rem', fontWeight: '500', lineHeight: '1.5' }}>
                            {vivaList[vivaIndex]?.question}
                          </h3>
                        </div>
                        <div className="flashcard-back" style={{ overflowY: 'auto' }}>
                          <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-secondary)', fontWeight: 'bold', marginBottom: '1rem' }}>Model Response</p>
                          <p style={{ fontSize: '1.05rem', lineHeight: '1.6', marginBottom: '1rem', textAlign: 'left' }}>
                            {vivaList[vivaIndex]?.answer}
                          </p>
                          {vivaList[vivaIndex]?.explanation && (
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-light)', paddingTop: '0.75rem', textAlign: 'left' }}>
                              <b>Details:</b> {vivaList[vivaIndex].explanation}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Nav controls */}
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', alignItems: 'center', marginTop: '1.5rem' }}>
                      <button 
                        className="btn btn-secondary" 
                        disabled={vivaIndex === 0} 
                        onClick={() => { setVivaIndex(vivaIndex - 1); setCardFlipped(false); }}
                      >
                        <ArrowLeft size={16} /> Previous
                      </button>
                      <button 
                        className="btn btn-secondary" 
                        disabled={vivaIndex === vivaList.length - 1} 
                        onClick={() => { setVivaIndex(vivaIndex + 1); setCardFlipped(false); }}
                      >
                        Next <ArrowRight size={16} />
                      </button>
                    </div>

                    <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                      <button className="btn btn-secondary" onClick={handleFetchViva}>
                        Re-generate Cards
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
