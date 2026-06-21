import React, { useState, useRef, useEffect } from 'react';
import { useDocuments } from '../context/DocumentContext';
import api from '../services/api';
import { Send, FileText, Bot, User, HelpCircle, Eye, X } from 'lucide-react';

export default function ChatSpace() {
  const { selectedDocument } = useDocuments();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Modal state for viewing source context details
  const [viewingSource, setViewingSource] = useState(null);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || !selectedDocument) return;

    const userMessage = { role: 'user', text: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setError(null);

    // Build history in the format: [{"role": "user"|"model", "text": "..."}]
    const history = messages.map((m) => ({
      role: m.role === 'user' ? 'user' : 'model',
      text: m.text,
    }));

    try {
      const response = await api.chatWithDocumentStream(selectedDocument.id, userMessage.text, history);
      
      if (!response.ok) {
        throw new Error("Failed to start answer stream");
      }

      // Initialize empty assistant message in history
      setMessages((prev) => [...prev, { role: 'assistant', text: '', sources: [] }]);

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let assistantText = "";
      let assistantSources = [];
      let done = false;
      let buffer = "";

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          buffer += decoder.decode(value, { stream: !done });
          const lines = buffer.split('\n');
          buffer = lines.pop(); // Save partial line back to buffer

          for (const line of lines) {
            if (line.trim()) {
              try {
                const data = JSON.parse(line);
                if (data.type === 'sources') {
                  assistantSources = data.sources;
                } else if (data.type === 'content') {
                  assistantText += data.content;
                } else if (data.type === 'error') {
                  throw new Error(data.message);
                }

                // Update the last assistant message in list
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last && last.role === 'assistant') {
                    last.text = assistantText;
                    last.sources = assistantSources;
                  }
                  return updated;
                });
              } catch (e) {
                console.error("Error parsing stream chunk:", e);
              }
            }
          }
        }
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to get answer. Make sure the backend server is running and the Gemini API key is valid.");
      // Clean up empty message if stream failed at startup
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last && last.role === 'assistant' && !last.text) {
          return prev.slice(0, -1);
        }
        return prev;
      });
    } finally {
      setLoading(false);
    }
  };

  const renderMessageText = (msg) => {
    if (msg.role === 'user' || !msg.sources || msg.sources.length === 0) {
      return <div style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</div>;
    }

    const parts = msg.text.split(/(\[\d+\])/g);
    return (
      <div style={{ whiteSpace: 'pre-wrap' }}>
        {parts.map((part, idx) => {
          const match = part.match(/^\[(\d+)\]$/);
          if (match) {
            const srcIdx = parseInt(match[1], 10) - 1;
            if (srcIdx >= 0 && srcIdx < msg.sources.length) {
              const src = msg.sources[srcIdx];
              return (
                <sup
                  key={idx}
                  onClick={() => setViewingSource(src)}
                  style={{
                    cursor: 'pointer',
                    color: '#60a5fa',
                    fontWeight: 'bold',
                    padding: '0 2px',
                    fontSize: '0.8rem',
                    textDecoration: 'underline'
                  }}
                  title={`Page ${src.page} (Click to inspect source)`}
                >
                  [{match[1]}]
                </sup>
              );
            }
          }
          return part;
        })}
      </div>
    );
  };

  if (!selectedDocument) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
        <Bot size={64} style={{ opacity: 0.2, marginBottom: '1.5rem' }} />
        <h2 style={{ color: 'var(--text-main)', marginBottom: '0.5rem' }}>No Document Selected</h2>
        <p>Please select a document from the Dashboard or Sidebar library first.</p>
      </div>
    );
  }

  const suggestedPrompts = [
    "What are the main concepts covered in this document?",
    "Summarize the introductory section.",
    "Explain the core arguments or mathematical formulas mentioned.",
  ];

  return (
    <div className="chat-window">
      {/* Top Banner */}
      <div className="glass-panel" style={{ padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <FileText size={20} style={{ color: 'var(--color-primary)' }} />
        <div>
          <h2 style={{ fontSize: '1.05rem', fontWeight: '600' }}>Chat Space</h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '500px' }}>
            Querying: {selectedDocument.filename}
          </p>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="chat-messages">
        {messages.length === 0 ? (
          <div style={{ margin: 'auto', maxWidth: '500px', textAlign: 'center', padding: '2rem 1rem' }}>
            <Bot size={48} style={{ color: 'var(--color-primary)', opacity: 0.6, marginBottom: '1rem' }} />
            <h3 style={{ marginBottom: '0.5rem' }}>Ask anything about this document</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              The study assistant retrieves relevant text blocks using semantic vector search and answers using Gemini.
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', textAlign: 'left' }}>
              {suggestedPrompts.map((prompt, i) => (
                <button
                  key={i}
                  className="glass-card"
                  onClick={() => setInput(prompt)}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.5rem', 
                    fontSize: '0.85rem', 
                    cursor: 'pointer', 
                    border: '1px solid var(--border-light)', 
                    textAlign: 'left' 
                  }}
                >
                  <HelpCircle size={14} style={{ color: 'var(--color-secondary)', flexShrink: 0 }} />
                  <span>{prompt}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '75%' }}>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.25rem', paddingLeft: '0.5rem', alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                {msg.role === 'user' ? (
                  <>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>You</span>
                    <User size={12} style={{ color: 'var(--text-muted)' }} />
                  </>
                ) : (
                  <>
                    <Bot size={12} style={{ color: 'var(--color-primary)' }} />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Assistant</span>
                  </>
                )}
              </div>
              <div className={`chat-bubble ${msg.role}`}>
                {renderMessageText(msg)}
                
                {/* Sources badges */}
                {msg.sources && msg.sources.length > 0 && (
                  <div className="sources-container">
                    <p style={{ fontWeight: '500', marginBottom: '0.2rem' }}>Cited Sources:</p>
                    {msg.sources.map((src, sIdx) => (
                      <span 
                        key={sIdx} 
                        className="source-badge"
                        onClick={() => setViewingSource(src)}
                        title="Click to view reference text"
                      >
                        Page {src.page} (Match: {Math.round(src.score * 100)}%)
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}

        {loading && (
          <div style={{ display: 'flex', gap: '0.5rem', alignSelf: 'flex-start', maxWidth: '75%', alignItems: 'center' }}>
            <Bot size={12} style={{ color: 'var(--color-primary)' }} />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Assistant is typing...</span>
            <div className="loader" style={{ width: '14px', height: '14px', borderWidth: '2px', borderTopColor: 'var(--color-primary)' }}></div>
          </div>
        )}

        {error && (
          <div style={{ color: '#ef4444', fontSize: '0.85rem', background: 'rgba(239, 68, 68, 0.08)', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.15)', alignSelf: 'center', maxWidth: '500px' }}>
            {error}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <form onSubmit={handleSend} style={{ display: 'flex', gap: '0.75rem' }}>
        <input
          type="text"
          className="input-field"
          placeholder={`Ask a question from "${selectedDocument.filename}"...`}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
        />
        <button type="submit" className="btn btn-primary" disabled={loading || !input.trim()}>
          <Send size={18} />
        </button>
      </form>

      {/* Source viewer drawer/modal */}
      {viewingSource && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 100,
          padding: '1rem'
        }}>
          <div className="glass-panel" style={{
            width: '100%',
            maxWidth: '600px',
            padding: '2rem',
            position: 'relative',
            maxHeight: '80vh',
            overflowY: 'auto'
          }}>
            <button 
              onClick={() => setViewingSource(null)}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)'
              }}
            >
              <X size={20} />
            </button>
            <h3 style={{ marginBottom: '0.5rem', color: 'var(--color-primary)' }}>Source Context Chunk</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Extracted from page {viewingSource.page} (FAISS Cosine Similarity: {Math.round(viewingSource.score * 100)}%)
            </p>
            <div style={{
              background: 'rgba(0,0,0,0.2)',
              padding: '1.25rem',
              borderRadius: '8px',
              border: '1px solid var(--border-light)',
              lineHeight: '1.6',
              fontSize: '0.95rem',
              whiteSpace: 'pre-wrap'
            }}>
              {viewingSource.text}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
