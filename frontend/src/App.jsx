import React, { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DocumentProvider, useDocuments } from './context/DocumentContext';
import Dashboard from './pages/Dashboard';
import ChatSpace from './pages/ChatSpace';
import StudyTools from './pages/StudyTools';
import ExamArena from './pages/ExamArena';
import './App.css'; // loads empty reset
import { LayoutDashboard, MessageSquare, BookOpen, PenTool, Bot, FileText, CheckCircle2, RefreshCw } from 'lucide-react';

function AppContent() {
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard, chat, study, exam
  const { documents, selectedDocument, setSelectedDocument } = useDocuments();

  const renderActivePage = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'chat':
        return <ChatSpace />;
      case 'study':
        return <StudyTools />;
      case 'exam':
        return <ExamArena />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className="sidebar flex flex-col h-screen">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem' }}>
          <Bot size={28} style={{ color: 'var(--color-primary)' }} />
          <span style={{ fontSize: '1.2rem', fontWeight: 'bold', letterSpacing: '-0.02em' }} className="gradient-text">Study Assistant</span>
        </div>

        <nav>
          <ul className="nav-list">
            <li 
              className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              <LayoutDashboard size={18} />
              <span>Dashboard</span>
            </li>
            <li 
              className={`nav-item ${activeTab === 'chat' ? 'active' : ''} ${!selectedDocument ? 'disabled' : ''}`}
              onClick={() => selectedDocument && setActiveTab('chat')}
              style={{ opacity: selectedDocument ? 1 : 0.4, cursor: selectedDocument ? 'pointer' : 'not-allowed' }}
              title={!selectedDocument ? "Select a document first" : ""}
            >
              <MessageSquare size={18} />
              <span>Chat Space</span>
            </li>
            <li 
              className={`nav-item ${activeTab === 'study' ? 'active' : ''} ${!selectedDocument ? 'disabled' : ''}`}
              onClick={() => selectedDocument && setActiveTab('study')}
              style={{ opacity: selectedDocument ? 1 : 0.4, cursor: selectedDocument ? 'pointer' : 'not-allowed' }}
              title={!selectedDocument ? "Select a document first" : ""}
            >
              <BookOpen size={18} />
              <span>Study Tools</span>
            </li>
            <li 
              className={`nav-item ${activeTab === 'exam' ? 'active' : ''} ${!selectedDocument ? 'disabled' : ''}`}
              onClick={() => selectedDocument && setActiveTab('exam')}
              style={{ opacity: selectedDocument ? 1 : 0.4, cursor: selectedDocument ? 'pointer' : 'not-allowed' }}
              title={!selectedDocument ? "Select a document first" : ""}
            >
              <PenTool size={18} />
              <span>Exam Arena</span>
            </li>
          </ul>
        </nav>

        {/* Sidebar Library Quick-Selector */}
        <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border-light)', paddingTop: '1.5rem', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.75rem', fontWeight: '700' }}>
            Library Docs
          </h3>
          <div className="doc-list" style={{ overflowY: 'auto', flex: 1 }}>
            {documents.length === 0 ? (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '0.5rem' }}>No PDFs uploaded.</p>
            ) : (
              documents.map((doc) => {
                const isDocActive = selectedDocument && selectedDocument.id === doc.id;
                return (
                  <div 
                    key={doc.id} 
                    className={`doc-item ${isDocActive ? 'active' : ''}`}
                    onClick={() => doc.status === 'completed' && setSelectedDocument(doc)}
                    style={{ 
                      opacity: doc.status === 'completed' ? 1 : 0.6,
                      cursor: doc.status === 'completed' ? 'pointer' : 'default',
                      padding: '0.5rem',
                      fontSize: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      marginBottom: '0.25rem',
                      borderRadius: '6px',
                      background: isDocActive ? 'rgba(139, 92, 246, 0.08)' : 'transparent',
                      border: isDocActive ? '1px solid rgba(139, 92, 246, 0.2)' : '1px solid transparent'
                    }}
                  >
                    <FileText size={14} style={{ color: isDocActive ? 'var(--color-primary)' : 'var(--text-muted)', flexShrink: 0 }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{doc.filename}</span>
                    {doc.status === 'processing' && (
                      <RefreshCw size={10} className="loader" style={{ width: '10px', height: '10px', borderTopColor: 'var(--color-primary)' }} />
                    )}
                    {doc.status === 'completed' && isDocActive && (
                      <CheckCircle2 size={10} style={{ color: '#10b981' }} />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>


      </aside>

      {/* Main App Content Viewport */}
      <main className="main-content flex-1 overflow-hidden flex flex-col">
        {renderActivePage()}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/*" element={
            <DocumentProvider>
              <AppContent />
            </DocumentProvider>
          } />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
