import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const api = {
  // Auth endpoints
  login: async (email, password) => {
    const formData = new URLSearchParams();
    formData.append('username', email); // OAuth2 expects username
    formData.append('password', password);
    const response = await apiClient.post('/auth/login', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    return response.data;
  },
  
  signup: async (email, password) => {
    const response = await apiClient.post('/auth/signup', { email, password });
    return response.data;
  },

  getMe: async () => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },

  // Document endpoints
  uploadDocument: async (file, onUploadProgress) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress,
    });
    return response.data;
  },

  listDocuments: async () => {
    const response = await apiClient.get('/documents/');
    return response.data;
  },

  getDocument: async (docId) => {
    const response = await apiClient.get(`/documents/${docId}`);
    return response.data;
  },

  deleteDocument: async (docId) => {
    const response = await apiClient.delete(`/documents/${docId}`);
    return response.data;
  },

  // Chat endpoint
  chatWithDocument: async (docId, message, history = []) => {
    const response = await apiClient.post(`/chat/${docId}`, {
      message,
      history,
    });
    return response.data;
  },

  chatWithDocumentStream: async (docId, message, history = []) => {
    const token = localStorage.getItem('token');
    const headers = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return fetch(`${API_BASE_URL}/chat/${docId}/stream`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ message, history }),
    });
  },

  // Study Tools endpoints
  generateSummary: async (docId) => {
    const response = await apiClient.post(`/study/${docId}/summary`);
    return response.data;
  },

  generateMCQs: async (docId, numQuestions = 5, difficulty = 'medium') => {
    const response = await apiClient.post(`/study/${docId}/mcq`, {
      num_questions: numQuestions,
      difficulty,
    });
    return response.data;
  },

  generateViva: async (docId, numQuestions = 5) => {
    const response = await apiClient.post(`/study/${docId}/viva`, {
      num_questions: numQuestions,
    });
    return response.data;
  },

  // Exam Mode endpoints
  generateExam: async (docId, num2Mark = 2, num5Mark = 2, num10Mark = 1) => {
    const response = await apiClient.post(`/evaluation/${docId}/exam`, {
      num_2_mark: num2Mark,
      num_5_mark: num5Mark,
      num_10_mark: num10Mark,
    });
    return response.data;
  },

  submitExam: async (sessionId, answers) => {
    // answers structure: [{question_id: 123, student_answer: "..."}]
    const response = await apiClient.post(`/evaluation/exam/${sessionId}/submit`, {
      answers,
    });
    return response.data;
  },

  getExamSession: async (sessionId) => {
    const response = await apiClient.get(`/evaluation/exam/${sessionId}`);
    return response.data;
  },

  // Analytics endpoints
  getAnalyticsDashboard: async () => {
    const response = await apiClient.get('/analytics/dashboard');
    return response.data;
  },
};
export default api;
