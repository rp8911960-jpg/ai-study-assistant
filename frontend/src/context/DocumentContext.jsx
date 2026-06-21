import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';

const DocumentContext = createContext();

export const DocumentProvider = ({ children }) => {
  const [documents, setDocuments] = useState([]);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchDocuments = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listDocuments();
      setDocuments(data.documents || []);
      // Auto-select first document if nothing is selected yet
      if (data.documents && data.documents.length > 0 && !selectedDocument) {
        // Find if there is a completed document
        const completed = data.documents.find(d => d.status === 'completed');
        if (completed) {
          setSelectedDocument(completed);
        } else {
          setSelectedDocument(data.documents[0]);
        }
      }
    } catch (err) {
      console.error("Error fetching documents:", err);
      setError("Failed to load documents from backend.");
    } finally {
      setLoading(false);
    }
  };

  const deleteDoc = async (docId) => {
    try {
      await api.deleteDocument(docId);
      setDocuments((prev) => prev.filter((doc) => doc.id !== docId));
      if (selectedDocument && selectedDocument.id === docId) {
        setSelectedDocument(null);
      }
    } catch (err) {
      console.error("Failed to delete document:", err);
      throw new Error("Failed to delete document.");
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  return (
    <DocumentContext.Provider
      value={{
        documents,
        selectedDocument,
        setSelectedDocument,
        loading,
        error,
        fetchDocuments,
        deleteDoc,
      }}
    >
      {children}
    </DocumentContext.Provider>
  );
};

export const useDocuments = () => {
  const context = useContext(DocumentContext);
  if (!context) {
    throw new Error('useDocuments must be used within a DocumentProvider');
  }
  return context;
};
