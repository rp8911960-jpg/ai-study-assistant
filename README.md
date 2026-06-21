# AI Study Assistant using RAG and Gemini API

This is a modular, production-ready, and deployable final year project for an **AI Study Assistant**. 
The application allows students to upload their study materials (PDFs), ask questions using Retrieval-Augmented Generation (RAG), review AI-generated summary notes, practice multiple-choice questions (MCQs), prepare for viva/interview exams via flashcards, and sit for written mock examinations graded automatically with constructive feedback by the Google Gemini API.

---

## 🚀 Key Features

*   **PDF Document Processor**: Upload and chunk text dynamically. Extracted blocks are parsed and vectorized.
*   **Decoupled Local FAISS Vector DB**: High-speed local searches mapped per Document ID. Index files are serialized in binary and metadata JSON files.
*   **Semantic RAG Q&A**: Asynchronous document query retrieval. Highlights exact page numbers where information resides.
*   **AI Study Companion Tools**:
    *   *Hierarchical Summarizer*: Formats textbook concepts into structured summaries, outlines, and chapter highlights.
    *   *Practice MCQs Quiz*: Generates interactive 4-option practice tests with immediate visual correct/incorrect feedback and detailed reasoning.
    *   *Viva Flashcards*: Flipped-card UI to test oral exam readiness.
*   **Exam Mode & AI Grading**: Generates exams containing 2, 5, and 10-mark questions. Features a live exam countdown timer, written answer textareas, and a graded scorecard reviewing conceptual accuracy with suggested model answers.

---

## 🛠️ Technology Stack

*   **Frontend**: React (Vite, vanilla CSS, Lucide icons, responsive layout)
*   **Backend**: FastAPI (Python 3.10+, SQLite database metadata tracker, SQLAlchemy ORM)
*   **AI APIs**: Google GenAI SDK (`gemini-2.5-flash` for text & JSON schemas, `text-embedding-004` for vectors)
*   **Vector Engine**: Local FAISS CPU indices
*   **Deployment**: Docker & Docker Compose

---

## 📂 Project Structure

```
ai-study-assistant/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── v1/
│   │   │       ├── endpoints/            # Document uploads, chat Q&A, study tools, exam sessions
│   │   │       └── router.py            # API aggregation
│   │   ├── core/
│   │   │   └── config.py                # Environment configs & SQLite dir setups
│   │   ├── db/
│   │   │   ├── database.py              # SQLite engine
│   │   │   └── vector_store.py          # Local FAISS index serializer
│   │   ├── models/                      # SQLAlchemy schemas (DB_Document, ExamSession, ExamQuestion)
│   │   ├── schemas/                     # Pydantic JSON requests / responses
│   │   ├── services/
│   │   │   ├── gemini.py                # Google GenAI embedding and content client
│   │   │   ├── pdf_processor.py         # PyPDF text extraction & sliding-window segmenter
│   │   │   └── rag.py                   # Context search orchestrator
│   │   └── main.py                      # FastAPI entrypoint
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── components/                  # Context overlays & dashboard cards
│   │   ├── context/
│   │   │   └── DocumentContext.jsx      # Global document state
│   │   ├── services/
│   │   │   └── api.js                   # Axios setup
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx            # Document Uploads & status list
│   │   │   ├── ChatSpace.jsx            # Q&A conversation panel
│   │   │   ├── StudyTools.jsx           # Summary tabs, interactive MCQs, Viva Prep
│   │   │   └── ExamArena.jsx            # Exam Mode panel & scoring sheets
│   │   ├── index.css                    # Premium glassmorphic styling system
│   │   ├── App.jsx                      # Navigation coordinator
│   │   └── main.jsx
│   ├── package.json
│   ├── Dockerfile
│   └── .env
├── docker-compose.yml
└── README.md
```

---

## 🔧 Installation & Local Setup

### Prerequisites
*   Python 3.10+
*   Node.js 18+ (npm)
*   Gemini API Key from [Google AI Studio](https://aistudio.google.com/)

---

### Step 1: Configure Backend

1.  Navigate to the backend directory:
    ```bash
    cd backend
    ```
2.  Create a virtual environment and activate it:
    ```bash
    python -m venv venv
    # On Windows:
    .\venv\Scripts\Activate.ps1
    # On Unix/macOS:
    source venv/bin/activate
    ```
3.  Install requirements:
    ```bash
    pip install -r requirements.txt
    ```
4.  Configure `.env` file (copy from `.env.example`):
    ```env
    PORT=8000
    DATABASE_URL=sqlite:///./data/sqlite.db
    UPLOAD_DIR=./data/uploads
    VECTOR_INDEX_DIR=./data/vector_indices
    GEMINI_API_KEY=your_actual_gemini_api_key
    ```
5.  Start backend server:
    ```bash
    uvicorn app.main:app --reload --port 8000
    ```
    The Swagger documentation will be available at `http://localhost:8000/docs`.

---

### Step 2: Configure Frontend

1.  Navigate to the frontend directory:
    ```bash
    cd ../frontend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Configure `.env` file (copy from `.env.example`):
    ```env
    VITE_API_URL=http://localhost:8000/api/v1
    ```
4.  Start React developer server:
    ```bash
    npm run dev
    ```
    Open `http://localhost:5173` in your browser.

---

## 🐳 Docker Deployment

To spin up both services simultaneously in containers:

1.  Open the root project directory.
2.  Create `.env` file in the root containing your API key:
    ```env
    GEMINI_API_KEY=your_gemini_api_key_here
    ```
3.  Build and launch containers:
    ```bash
    docker compose up --build
    ```
4.  Access the applications:
    *   **Frontend**: `http://localhost:3000`
    *   **Backend API**: `http://localhost:8000`
