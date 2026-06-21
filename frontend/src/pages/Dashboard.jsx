import React, { useState, useEffect, useRef } from 'react';
import { useDocuments } from '../context/DocumentContext';
import api from '../services/api';
import { FileText, Upload, Trash2, CheckCircle2, AlertCircle, RefreshCw, Layers, TrendingUp, Calendar, Target, Award } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function Dashboard() {
  const { documents, selectedDocument, setSelectedDocument, fetchDocuments, deleteDoc } = useDocuments();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState(null);
  const fileInputRef = useRef(null);

  const [analytics, setAnalytics] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoadingAnalytics(true);
      const data = await api.getAnalyticsDashboard();
      setAnalytics(data);
    } catch (err) {
      console.error("Failed to load analytics", err);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.type !== 'application/pdf') {
      setUploadError("Only PDF files are supported!");
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setUploadError(null);

    try {
      await api.uploadDocument(file, (progressEvent) => {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        setUploadProgress(percentCompleted);
      });
      fetchDocuments();
    } catch (err) {
      console.error(err);
      setUploadError(err.response?.data?.detail || "Failed to upload document.");
    } finally {
      setUploading(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this document and all its indices?")) {
      try {
        await deleteDoc(id);
      } catch (err) {
        alert("Failed to delete document.");
      }
    }
  };

  return (
    <div className="study-content-container" style={{ maxWidth: '1200px', margin: '0 auto', width: '100%', paddingBottom: '3rem' }}>
      {/* Header section */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="gradient-text" style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Overview & Analytics</h1>
          <p style={{ color: 'var(--text-muted)' }}>Track your progress and manage your study materials.</p>
        </div>
        <button className="btn btn-secondary" onClick={() => { fetchDocuments(); fetchAnalytics(); }} title="Refresh">
          <RefreshCw size={18} />
        </button>
      </div>

      {/* Analytics Section */}
      {!loadingAnalytics && analytics && (
        <div style={{ marginBottom: '2.5rem' }}>
          {/* Stat Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ padding: '1rem', background: 'rgba(139, 92, 246, 0.1)', borderRadius: '12px', color: '#a78bfa' }}>
                <TrendingUp size={24} />
              </div>
              <div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Study Streak</p>
                <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{analytics.current_streak} days</p>
              </div>
            </div>
            <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ padding: '1rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '12px', color: '#60a5fa' }}>
                <Target size={24} />
              </div>
              <div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Average Score</p>
                <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{analytics.average_exam_score}%</p>
              </div>
            </div>
            <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ padding: '1rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '12px', color: '#34d399' }}>
                <Award size={24} />
              </div>
              <div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Exams Taken</p>
                <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{analytics.recent_exams.length}</p>
              </div>
            </div>
            <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ padding: '1rem', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '12px', color: '#fbbf24' }}>
                <Calendar size={24} />
              </div>
              <div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Total Activities</p>
                <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{analytics.total_study_sessions}</p>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '1.5rem' }}>
            {/* Charts */}
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem', fontWeight: '600' }}>Exam Performance Over Time</h3>
              <div style={{ height: '250px', width: '100%' }}>
                {analytics.recent_exams.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analytics.recent_exams}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                      <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                        itemStyle={{ color: '#fff' }}
                      />
                      <Line type="monotone" dataKey="percentage" name="Score (%)" stroke="var(--color-primary)" strokeWidth={3} dot={{ r: 4, fill: 'var(--color-primary)' }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                    No exam data available yet.
                  </div>
                )}
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem', fontWeight: '600' }}>Daily Activity (Last 30 Days)</h3>
              <div style={{ height: '250px', width: '100%' }}>
                {analytics.daily_activity.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.daily_activity}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                      <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                        itemStyle={{ color: '#fff' }}
                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                      />
                      <Bar dataKey="count" name="Activities" fill="var(--color-secondary)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                    No activity recorded in the last 30 days.
                  </div>
                )}
              </div>
            </div>
            
            {/* Weak Topics */}
            {analytics.weak_topics && analytics.weak_topics.length > 0 && (
              <div className="glass-panel" style={{ padding: '1.5rem', gridColumn: '1 / -1' }}>
                <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <AlertCircle size={18} style={{ color: '#f87171' }} />
                  Needs Review (Weak Topics)
                </h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                  {analytics.weak_topics.map((item, idx) => (
                    <div key={idx} style={{ 
                      background: 'rgba(239, 68, 68, 0.1)', 
                      border: '1px solid rgba(239, 68, 68, 0.2)', 
                      borderRadius: '8px', 
                      padding: '0.75rem 1rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem'
                    }}>
                      <span style={{ fontWeight: '500', color: '#fca5a5' }}>{item.topic}</span>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', gap: '0.75rem' }}>
                        <span>Avg: <b>{item.average_score}%</b></span>
                        <span>Mistakes: <b>{item.count}</b></span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Library & Upload Section */}
      <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Study Library</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {/* Upload Card */}
        <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Upload size={20} className="gradient-text" /> Upload Document
          </h2>
          
          <div 
            onClick={triggerFileInput}
            style={{
              border: '2px dashed var(--border-light)',
              borderRadius: '12px',
              padding: '2.5rem 1.5rem',
              textAlign: 'center',
              cursor: 'pointer',
              background: 'rgba(255, 255, 255, 0.01)',
              transition: 'var(--transition-fast)'
            }}
            onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--color-primary)'}
            onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--border-light)'}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept=".pdf" 
              style={{ display: 'none' }} 
            />
            <FileText size={48} style={{ color: 'var(--color-primary)', opacity: 0.8, marginBottom: '1rem' }} />
            <p style={{ fontWeight: '500', marginBottom: '0.25rem' }}>Select PDF Study Guide</p>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Files up to 50MB</p>
          </div>

          {uploading && (
            <div style={{ marginTop: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                <span>Uploading file...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div style={{ height: '6px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '10px', overflow: 'hidden' }}>
                <div style={{ width: `${uploadProgress}%`, height: '100%', background: 'linear-gradient(90deg, var(--color-primary), var(--color-secondary))', transition: 'width 0.1s ease' }}></div>
              </div>
            </div>
          )}

          {uploadError && (
            <div style={{ marginTop: '1.25rem', display: 'flex', gap: '0.5rem', color: '#f87171', fontSize: '0.85rem', background: 'rgba(239, 68, 68, 0.08)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.15)' }}>
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>{uploadError}</span>
            </div>
          )}
        </div>

        {/* Workspace Quick-Info Card */}
        <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Layers size={20} className="gradient-text" /> AI Engine Status
            </h2>
            <p style={{ fontSize: '0.9rem', lineHeight: '1.6', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Once uploaded, our system extracts PDF text page-by-page, generates semantic embeddings using Google Gemini's <b>text-embedding-004</b> model, and builds a local <b>FAISS vector store index</b>.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
              <span style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', borderRadius: '4px', background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.2)', color: '#a78bfa' }}>Gemini RAG</span>
              <span style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', borderRadius: '4px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', color: '#60a5fa' }}>FAISS Index</span>
              <span style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', color: '#34d399' }}>FastAPI</span>
            </div>
          </div>
          
          {selectedDocument ? (
            <div className="glass-card" style={{ borderLeft: '4px solid var(--color-primary)', background: 'rgba(139, 92, 246, 0.03)' }}>
              <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-primary)', fontWeight: 'bold', marginBottom: '0.25rem' }}>Active Workspace Document</p>
              <p style={{ fontWeight: '600', fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedDocument.filename}</p>
            </div>
          ) : (
            <div className="glass-card" style={{ borderLeft: '4px solid var(--color-accent)', background: 'rgba(244, 63, 94, 0.03)' }}>
              <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-accent)', fontWeight: 'bold', marginBottom: '0.25rem' }}>No Active Document</p>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Please upload or select a file to activate search features.</p>
            </div>
          )}
        </div>
      </div>

      {/* Document Directory table */}
      <div className="glass-panel" style={{ padding: '1.5rem', marginTop: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Library Items ({documents.length})</h2>
        {documents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1.5rem', color: 'var(--text-muted)' }}>
            <FileText size={40} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
            <p>Your library is empty. Upload a PDF above to begin.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-light)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Document Name</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Pages</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Chunks</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => {
                  const isActive = selectedDocument && selectedDocument.id === doc.id;
                  return (
                    <tr 
                      key={doc.id}
                      onClick={() => doc.status === 'completed' && setSelectedDocument(doc)}
                      style={{ 
                        borderBottom: '1px solid var(--border-light)', 
                        cursor: doc.status === 'completed' ? 'pointer' : 'default',
                        background: isActive ? 'rgba(139, 92, 246, 0.05)' : 'transparent',
                        transition: 'var(--transition-fast)'
                      }}
                      onMouseOver={(e) => {
                        if (doc.status === 'completed') e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = isActive ? 'rgba(139, 92, 246, 0.05)' : 'transparent';
                      }}
                    >
                      <td style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: isActive ? '600' : 'normal' }}>
                        <FileText size={18} style={{ color: isActive ? 'var(--color-primary)' : 'var(--text-muted)' }} />
                        <span style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={doc.filename}>
                          {doc.filename}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>{doc.total_pages || '-'}</td>
                      <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>{doc.chunk_count || '-'}</td>
                      <td style={{ padding: '1rem' }}>
                        {doc.status === 'completed' && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: '#10b981', fontSize: '0.85rem' }}>
                            <CheckCircle2 size={14} /> Ready
                          </span>
                        )}
                        {doc.status === 'processing' && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: '#f59e0b', fontSize: '0.85rem' }}>
                            <RefreshCw size={14} className="loader" style={{ width: '12px', height: '12px', borderTopColor: '#f59e0b' }} /> Indexing...
                          </span>
                        )}
                        {doc.status === 'failed' && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: '#ef4444', fontSize: '0.85rem' }}>
                            <AlertCircle size={14} /> Failed
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right' }}>
                        <button 
                          className="btn btn-danger" 
                          style={{ padding: '0.4rem', borderRadius: '6px' }}
                          onClick={(e) => handleDelete(e, doc.id)}
                          title="Delete document"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
