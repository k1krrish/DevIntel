# DevIntel V1

DevIntel is an AI-powered GitHub code intelligence and codebase Q&A platform.
It clones a public GitHub repository, indexes the source code using `tree-sitter` and Gemini embeddings into Qdrant, and allows you to semantically search and ask questions about the codebase using Gemini as the LLM.

## Architecture
Frontend (React + Vite + Tailwind)
   ↓
FastAPI (Backend)
   ↓
Services (Indexing, Parsing)
   ↓
AI Engine (Retrieval, Reranking, LLM)
   ↓
Qdrant + PostgreSQL (SQLite fallback)
   ↓
Gemini

## AI Pipeline
GitHub
 ↓
Tree-sitter
 ↓
Code Chunks
 ↓
Embeddings
 ↓
Qdrant
 ↓
Retrieval
 ↓
Reranking
 ↓
Gemini

## Setup
### Requirements
- Node.js (for frontend)
- Python 3.11+ (for backend)

### Environment Variables
Edit the `.env` file in the root directory:
```env
# Optional: Use docker-compose postgres if desired, defaults to SQLite
# DATABASE_URL=postgresql+asyncpg://devintel:devintel_password@localhost:5432/devintel
# QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=
GEMINI_API_KEY=your_gemini_api_key
```

### Running

#### 1. Backend
```bash
cd backend
python -m venv venv
# On Windows: venv\Scripts\activate
# On Mac/Linux: source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```
The backend will run on `http://localhost:8000`.

#### 2. Frontend
```bash
cd frontend
npm install
npm run dev
```
The frontend will run on `http://localhost:5173`.

## Testing
1. Navigate to the frontend UI (`http://localhost:5173`).
2. Click "Add Repository" and provide a public GitHub URL.
3. Wait for the indexing status to change from PENDING -> CLONING -> PARSING -> EMBEDDING -> INDEXING -> COMPLETED.
4. Click on the repository to open the Workspace.
5. Use the Chat to ask questions about the repository, or use the Search to find specific code chunks.
