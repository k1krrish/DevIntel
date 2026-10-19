# DevIntel ⚡

[![Vercel Deployment](https://img.shields.io/badge/Vercel-Live%20App-black?style=for-the-badge&logo=vercel)](https://dev-intel-mu.vercel.app)
[![Render Backend](https://img.shields.io/badge/Render-Live%20API-46E3B7?style=for-the-badge&logo=render&logoColor=black)](https://devintel-6ebi.onrender.com)
[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react)](https://react.dev)
[![Google Gemini](https://img.shields.io/badge/Google%20Gemini-8E75C2?style=for-the-badge&logo=googlegemini)](https://ai.google.dev/)
[![Qdrant](https://img.shields.io/badge/Qdrant-Vector%20DB-DC2626?style=for-the-badge)](https://qdrant.tech/)

> **DevIntel** is an AI-powered GitHub codebase intelligence and developer pair-programming platform. It indexes GitHub repositories with **25+ Tree-sitter AST grammars**, generates 3072-dimensional vector embeddings with Google Gemini, stores them in **Qdrant**, maps visual dependency architecture graphs, and answers questions with grounded line-level source code citations.

---

### 🌐 Live Production Links

* **🚀 Live Web Application**: [https://dev-intel-mu.vercel.app](https://dev-intel-mu.vercel.app)
* **⚡ Live Backend API**: [https://devintel-6ebi.onrender.com](https://devintel-6ebi.onrender.com)
* **📚 Interactive Swagger API Docs**: [https://devintel-6ebi.onrender.com/docs](https://devintel-6ebi.onrender.com/docs)
* **❤️ Health Check Endpoint**: [https://devintel-6ebi.onrender.com/health](https://devintel-6ebi.onrender.com/health)

---

## 🏗️ Architecture

```text
                                +-----------------------------+
                                |  Global Edge / Vercel CDN   |
                                | https://dev-intel-mu.vercel.app |
                                +--------------+--------------+
                                               |
                                          HTTPS REST
                                               ↓
                                +-----------------------------+
                                |  FastAPI Cloud / Render.com |
                                | https://devintel-6ebi.onrender.com |
                                +--------------+--------------+
                                               |
       +---------------------------------------+---------------------------------------+
       |                                                                               |
       ↓                                                                               ↓
[Indexing Pipeline]                                                           [Intelligence & Q&A Pipeline]
  ├── Git Clone Engine (`data/repos`)                                           ├── Qdrant Vector Similarity
  ├── File Discovery & Ignore Filters                                           ├── Multi-Factor Reranker
  ├── 25+ Tree-sitter AST Grammars                                              ├── Architecture Dependency Graph
  ├── Google Gemini Embeddings (`gemini-embedding-001`, 3072-dim)               ├── Grounded Code Studio (Tests/APIs)
  └── Qdrant Vector Collection (`devintel_code`)                                └── Gemini Flash Pair Engine
```

---

## 🚀 Key Features

* **Grounded Codebase Q&A**: Ask architectural, algorithmic, or functional questions about any indexed repository with multi-turn chat and markdown export.
* **Semantic Code Search**: Search concepts like *"jwt token verification"* or *"database connection pool"* to find exact functions across 25+ languages.
* **25+ Tree-sitter AST Grammars**: Parses functions, classes, interfaces, and methods as semantic AST units rather than arbitrary line slices.
* **Interactive Architecture & Dependency Graph**: Maps internal cross-file imports, detects central hub files, and groups components into module clusters.
* **Code Studio (AI Generator & Refactorer)**: Generates unit tests, API endpoints, type definitions, and refactored code grounded in repository patterns.
* **Interactive Code Viewer with AI Explainer**: Inspect files with syntax highlighting and line numbers, and trigger 1-click architectural and security explanations.
* **Git Insights & Activity Feed**: Inspects recent commit history, authors, commit timestamps, and top contributor rankings.
* **Automated Security & Architecture Audits**: 1-click comprehensive security, error-handling, and architectural audit reports.
* **Prompt Injection Defenses**: Hardened system instructions reject untrusted repository code tampering.

---

## 💻 Supported Languages & AST Grammars (25+)

| Category | Languages & File Formats |
| :--- | :--- |
| **Primary ASTs** | Python (`.py`), JavaScript (`.js`, `.jsx`, `.mjs`, `.cjs`), TypeScript (`.ts`, `.tsx`), Java (`.java`), Go (`.go`), Rust (`.rs`), C (`.c`, `.h`), C++ (`.cpp`, `.hpp`, `.cc`, `.cxx`), C# (`.cs`), Ruby (`.rb`), PHP (`.php`), Kotlin (`.kt`, `.kts`), Lua (`.lua`) |
| **Data & Queries** | SQL (`.sql`), HTML (`.html`), JSON (`.json`), YAML (`.yaml`, `.yml`), TOML (`.toml`), Markdown (`.md`) |
| **DevOps & Systems**| Bash / Shell (`.sh`, `.bash`, `.zsh`), Dockerfile, Containerfile, Makefile, CMakeLists.txt |
| **Configs & Markup**| XML (`.xml`), CSS (`.css`), SCSS (`.scss`), LESS (`.less`), Protobuf (`.proto`), GraphQL (`.graphql`), `.env.example`, `.ini`, `.conf` |

---

## 🛠️ Tech Stack

* **Backend**: FastAPI, SQLAlchemy (Async), aiosqlite, Tree-sitter (21 grammars), GitPython
* **Vector DB**: Qdrant (Local disk or Docker) with 3072 vector dimensions
* **AI Engine**: Google GenAI SDK (`gemini-embedding-001` & `gemini-flash-lite-latest`)
* **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Lucide Icons, React Markdown
* **Deployment**: Vercel (Frontend Global CDN) + Render.com (Backend Docker Web Service)

---

## ⚙️ Local Development Setup

### 1. Prerequisites
* Python 3.11+
* Node.js 18+
* Google Gemini API Key

### 2. Backend Setup
```bash
cd backend
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
cp ../.env.example ../.env
# Add your GEMINI_API_KEY in .env

uvicorn app.main:app --host 127.0.0.1 --port 8000
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:5173` to start pairing with DevIntel locally.

---

## 📜 License

MIT License. Built for developers by developers.
