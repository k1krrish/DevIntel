# DevIntel V1 ⚡

DevIntel is an AI-powered GitHub code intelligence and codebase Q&A platform.
It clones public GitHub repositories, analyzes the code using **Tree-sitter AST parsing**, generates 3072-dimensional vector embeddings with Google Gemini, stores them in **Qdrant**, and answers questions with grounded source code references.

---

## 🏗️ Architecture

```text
User / Browser
      ↓
Vite + React + Tailwind Frontend (Port 5173)
      ↓
FastAPI Backend (Port 8000)
      ↓
Indexing Pipeline
  ├── Git Clone (data/repos)
  ├── File Discovery & Configurable Ignore Filter
  ├── Tree-sitter AST Structural Parser (Python, JS, TS, Java)
  ├── Gemini Embeddings (`gemini-embedding-001`, 3072-dim)
  └── Qdrant Vector DB (devintel_code collection)
      ↓
Query & Q&A Pipeline
  ├── Qdrant Vector Retrieval (Cosine Similarity)
  ├── Keyword & Path Boost Reranker
  ├── Prompt Injection Defense & Context Formulation
  └── Grounded Gemini LLM (`gemini-flash-lite-latest`)
      ↓
Grounded Answer + Exact Source Citations (Files & Lines)
```

---

## 🚀 Key Features

* **Grounded Codebase Q&A**: Ask architectural, algorithmic, or functional questions about any indexed repository.
* **Semantic Code Search**: Search concepts like *"jwt token verification"* or *"database connection"* to find exact functions even without exact keyword matches.
* **Tree-sitter AST Parsing**: Instead of arbitrary character slicing, DevIntel understands functions, classes, and methods as semantic units.
* **Interactive Code Citations**: Clickable source pills show file paths, symbols, and start/end line numbers.
* **File Explorer**: Browse the repository's indexed file tree directly from the workspace.
* **Injection Defenses**: Hardened system prompts prevent prompt injection from untrusted repository code.
* **1-Click Quick Indexing**: Quick template buttons for open-source repositories (Bottle, RealWorld Express, Axios, Spoon-Knife).
* **Repository Deletion**: Cleanly wipes repository records, cloned files, and vector embeddings in one click.

---

## 🛠️ Tech Stack

* **Backend**: FastAPI, SQLAlchemy (Async), SQLite / PostgreSQL, GitPython, Tree-sitter
* **Vector DB**: Qdrant (Local disk or Docker)
* **AI Engine**: Google GenAI SDK (`gemini-embedding-001` & `gemini-flash-lite-latest`)
* **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Lucide Icons, React Markdown

---

## ⚙️ Setup & Installation

### 1. Requirements
* Python 3.11+
* Node.js 18+
* Google Gemini API Key

### 2. Environment Configuration
Create a `.env` file in the root directory:
```env
GEMINI_API_KEY="your-gemini-api-key"
# Optional (defaults to local disk storage & SQLite if omitted):
# DATABASE_URL=postgresql+asyncpg://devintel:devintel_password@localhost:5432/devintel
# QDRANT_URL=http://localhost:6333
```

### 3. Backend Setup
```bash
cd backend
python -m venv ../venv
# Activate virtualenv (Windows: ..\venv\Scripts\activate, Linux/Mac: source ../venv/bin/activate)
pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

### 4. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

---

## 🧪 Testing

Run automated tests with `pytest`:
```bash
cd backend
python -m pytest tests
```

Tests verify:
* GitHub URL parsing & domain validation
* File filtering (.git, node_modules, binaries)
* Tree-sitter AST parsing & chunking
* Semantic vector retrieval & reranker boosting
* Prompt injection protection in system instructions
* FastAPI REST endpoints

---

## 📡 API Endpoints

* `GET /health` — Health check
* `GET /repositories` — List all repositories
* `POST /repositories` — Ingest and begin background indexing of a GitHub repository
* `GET /repositories/{id}` — Repository details & indexing status
* `DELETE /repositories/{id}` — Delete repository, files, and vectors
* `GET /repositories/{id}/files` — List all indexed files in the repository
* `GET /repositories/{id}/search?q={query}` — Semantic code search
* `POST /repositories/{id}/chat` — Ask questions about the codebase
