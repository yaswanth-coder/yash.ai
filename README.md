<div align="center">

<h1>🤖 Yash.AI</h1>

**Your intelligent personal AI assistant — powered by Gemini 2.5 Flash**

*Chat naturally. Attach files. Remember your history. All in one sleek interface.*

[![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115%2B-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js&logoColor=white)](https://nextjs.org)
[![Gemini](https://img.shields.io/badge/Gemini-2.5%20Flash-4285F4?style=flat-square&logo=google&logoColor=white)](https://ai.google.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker&logoColor=white)](docker-compose.yml)

[Quick Start](#-quick-start) · [Features](#-features) · [Architecture](#-architecture) · [API Reference](#-api-reference) · [Project Structure](#-project-structure)

</div>

---

## ✨ Key Highlights

✅ **Natural Language Chat** — Ask anything, get clean, well-formatted Markdown responses  
✅ **Gemini 2.5 Flash** — State-of-the-art Google AI model with long context and file understanding  
✅ **File Attachments** — Upload PDFs and images; AI reads and reasons about them  
✅ **Full Conversation History** — Every chat thread saved, searchable, and resumable  
✅ **JWT Auth** — Secure user accounts with token-based authentication  
✅ **Guest Mode** — Try the AI without signing up — no account required  
✅ **Multi-Agent Architecture** — Specialized agents for coding, research, vision, and documents (extensible)  
✅ **Docker Ready** — Full-stack deployment with one command  
✅ **Responsive UI** — Dark-mode Next.js frontend, works beautifully on mobile and desktop  

---

## 💡 Why Yash.AI?

Most AI wrappers are just thin shells over an API. Yash.AI is different:

- **Persistent memory** — conversations are stored per-user in SQLite so you never lose context
- **File intelligence** — upload a PDF or screenshot and ask questions about it in the same chat
- **Extensible agent layer** — specialized agents for coding, research, document analysis, and vision are wired in and ready to be built upon
- **Production-grade backend** — FastAPI + SQLAlchemy + JWT auth, not a weekend prototype

---

## 🚀 Features

### 💬 AI Chat with Gemini 2.5 Flash

Every message is routed through Google's latest Gemini model with a custom system prompt:

> *"You are Yash.AI, a highly capable, articulate, and intelligent personal AI assistant built to help users with coding, research, writing, problem-solving, and general inquiries."*

Responses are clean, structured **Markdown** with syntax-highlighted code blocks rendered directly in the browser.

### 📎 File Attachments

Attach files to any message — the AI reads them and incorporates their content into its response:

| Format | Handling |
|--------|----------|
| `.pdf` | Text extracted via `pypdf`, injected as context |
| `.png` / `.jpg` / `.jpeg` / `.webp` | Sent as raw image bytes to Gemini Vision |

### 🗂️ Conversation Management

- Every new chat for a logged-in user auto-creates a titled conversation
- Resume any past conversation — full history is re-fed to the model for coherent multi-turn dialogue
- Delete conversations from the sidebar
- Guest users can still chat (no history saved)

### 🔐 Authentication

- Register with email + password
- JWT tokens with 7-day expiry stored in `localStorage`
- Protected routes redirect to `/login`
- `/auth/me` endpoint validates the current token

### 🤖 Multi-Agent Architecture (Extensible)

The `agents/` layer is built and ready to be extended:

| Agent | Status | Purpose |
|-------|--------|---------|
| `CodingAgent` | 🔧 Scaffold | Code generation, debugging, explanation |
| `ResearchAgent` | 🔧 Scaffold | Web research, fact-finding, summarization |
| `DocumentAgent` | 🔧 Scaffold | Deep document Q&A and analysis |
| `VisionAgent` | 🔧 Scaffold | Image description and visual reasoning |
| `PlannerAgent` | 🔧 Scaffold | Task decomposition and multi-step planning |

---

## 🏗️ Architecture

```
User (browser)
      │
      ▼
Next.js Frontend (port 3000)
  ┌─────────────────────────────────────────┐
  │  /login  /register  /chat               │
  │  Sidebar · ChatMessage · ChatInput      │
  │  react-markdown · lucide-react          │
  └───────────────┬─────────────────────────┘
                  │ HTTP / REST (axios)
                  ▼
FastAPI Backend (port 8000)
  ┌─────────────────────────────────────────┐
  │  /auth   /chat   /conversations  /files │
  │                                         │
  │  ┌─────────────┐   ┌─────────────────┐  │
  │  │  Auth Layer │   │  Chat Service   │  │
  │  │  JWT+BCrypt │   │  Gemini 2.5 SDK │  │
  │  └─────────────┘   └────────┬────────┘  │
  │                             │            │
  │  ┌──────────────────────────▼──────┐    │
  │  │         Agent Orchestrator      │    │
  │  │  Coding · Research · Vision     │    │
  │  │  Document · Planner             │    │
  │  └─────────────────────────────────┘    │
  └───────┬──────────────────┬──────────────┘
          │                  │
          ▼                  ▼
     SQLite (yash.db)    uploads/
     Users · Convs       PDFs · Images
     Messages
```

---

## 🗃️ Database Schema

```sql
-- User accounts
CREATE TABLE users (
    id            TEXT PRIMARY KEY,
    email         TEXT UNIQUE NOT NULL,
    full_name     TEXT,
    password_hash TEXT NOT NULL,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Chat conversations (per user)
CREATE TABLE conversations (
    id         TEXT PRIMARY KEY,
    user_id    TEXT REFERENCES users(id),
    title      TEXT DEFAULT 'New Chat',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Individual messages within a conversation
CREATE TABLE messages (
    id              TEXT PRIMARY KEY,
    conversation_id TEXT REFERENCES conversations(id),
    role            TEXT NOT NULL,   -- 'user' | 'assistant'
    content         TEXT NOT NULL,
    file_path       TEXT,            -- path to uploaded attachment (if any)
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 📡 API Reference

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/auth/register` | Register new user → returns JWT token |
| `POST` | `/auth/login` | Login → returns JWT token |
| `GET` | `/auth/me` | Get current authenticated user |

### Chat

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/chat/` | Send a message (with optional `conversation_id` and `file_path`) |

**Request body:**
```json
{
  "message": "Explain the contents of this PDF",
  "conversation_id": "abc-123",
  "file_path": "/uploads/uuid_document.pdf"
}
```

**Response:**
```json
{
  "response": "The document discusses...",
  "conversation_id": "abc-123"
}
```

### Conversations

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/conversations/` | List all conversations for current user |
| `POST` | `/conversations/` | Create a new conversation |
| `GET` | `/conversations/{id}` | Get full conversation with all messages |
| `DELETE` | `/conversations/{id}` | Delete a conversation |

### Files

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/files/upload` | Upload a file (PDF, PNG, JPG, JPEG, WEBP) |
| `GET` | `/files/download/{filename}` | Download an uploaded file |

---

## ⚡ Quick Start

### Prerequisites

- **Python 3.10+**
- **Node.js 18+**
- A free [Google AI Studio API key](https://aistudio.google.com/) (Gemini)

---

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/yash.AI
cd yash.AI
```

---

### 2. Backend Setup

```bash
cd apps/backend

# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate       # Windows
# source venv/bin/activate  # Linux/macOS

# Install dependencies
pip install -r requirement.txt
```

**Create your `.env` file:**
```env
GEMINI_API_KEY=your-google-ai-studio-key-here
DATABASE_URL=sqlite:///./yash.db
JWT_SECRET_KEY=change-this-in-production
JWT_ALGORITHM=HS256
```

**Run the backend:**
```bash
uvicorn app.main:app --reload --port 8000
```

Interactive API docs available at: `http://localhost:8000/docs`

---

### 3. Frontend Setup

```bash
cd apps/yash-frontend

# Install dependencies
npm install

# Configure environment
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local

# Run the dev server
npm run dev
```

Open: `http://localhost:3000`

---

### 4. Docker (Full Stack)

```bash
# From project root — spins up frontend, backend, PostgreSQL, Redis, ChromaDB
docker-compose up --build
```

| Service | URL |
|---------|-----|
| Frontend | `http://localhost:3000` |
| Backend | `http://localhost:8000` |
| API Docs | `http://localhost:8000/docs` |

---

## 🗂️ Project Structure

```
yash.AI/
├── docker-compose.yml              # Full-stack Docker orchestration
│
├── apps/
│   ├── backend/                    # FastAPI Python backend
│   │   ├── app/
│   │   │   ├── main.py             # FastAPI app entry point
│   │   │   ├── agents/             # Specialized AI agent modules
│   │   │   │   ├── coding.py           # Code generation agent
│   │   │   │   ├── document.py         # Document analysis agent
│   │   │   │   ├── research.py         # Research agent
│   │   │   │   ├── vision.py           # Image understanding agent
│   │   │   │   └── planner.py          # Task planning agent
│   │   │   ├── api/                # REST API route handlers
│   │   │   │   ├── auth.py             # Register, Login, /me
│   │   │   │   ├── chat.py             # Core chat endpoint
│   │   │   │   ├── conversations.py    # CRUD for conversations
│   │   │   │   └── files.py            # File upload/download
│   │   │   ├── core/               # App config & shared utilities
│   │   │   │   ├── config.py           # Settings (reads .env)
│   │   │   │   ├── database.py         # SQLAlchemy engine + session
│   │   │   │   ├── deps.py             # Dependency injection
│   │   │   │   └── security.py         # JWT + password hashing
│   │   │   ├── models/             # SQLAlchemy ORM models
│   │   │   │   ├── user.py
│   │   │   │   ├── conversation.py
│   │   │   │   └── message.py
│   │   │   ├── schemas/            # Pydantic request/response schemas
│   │   │   ├── services/           # Business logic
│   │   │   │   ├── gemini.py           # Google Gemini 2.5 integration
│   │   │   │   └── file_service.py     # PDF/image content extraction
│   │   │   ├── memory/             # (Planned) Vector memory / RAG
│   │   │   └── rag/                # (Planned) Retrieval-augmented gen
│   │   ├── uploads/                # Uploaded files (PDFs, images)
│   │   ├── yash.db                 # SQLite database
│   │   └── requirement.txt
│   │
│   └── yash-frontend/              # Next.js 16 TypeScript frontend
│       ├── app/
│       │   ├── chat/page.tsx       # Main chat interface
│       │   ├── login/page.tsx      # Login page
│       │   └── register/           # Registration page
│       ├── components/
│       │   ├── Sidebar.tsx             # Conversation list + user info
│       │   ├── ChatMessage.tsx         # Message bubble + markdown
│       │   ├── ChatInput.tsx           # Input bar + file attachment
│       │   ├── ThinkingIndicator.tsx   # AI loading animation
│       │   └── EmptyState.tsx          # Suggested prompts on new chat
│       └── services/               # Axios API client functions
│           ├── chat.ts
│           ├── conversations.ts
│           └── auth.ts
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Language (Backend)** | Python 3.10+ |
| **Web Framework** | FastAPI 0.115+ |
| **AI / LLM** | Google Gemini 2.5 Flash (`google-genai` SDK) |
| **Auth** | JWT (`python-jose`) + BCrypt (`passlib`) |
| **Database** | SQLite via SQLAlchemy 2.0 (Postgres-ready via Docker) |
| **File Processing** | `pypdf` (PDF text) + raw bytes (images → Gemini Vision) |
| **Language (Frontend)** | TypeScript + React 19 |
| **Frontend Framework** | Next.js 16 |
| **Styling** | Tailwind CSS v4 |
| **Markdown Rendering** | `react-markdown` + `remark-gfm` |
| **HTTP Client** | Axios |
| **Icons** | Lucide React |
| **Container** | Docker + Docker Compose |
| **Cache / Queue** | Redis (Docker, planned) |
| **Vector DB** | ChromaDB (Docker, planned for RAG) |

---

## 🔒 Security

| Concern | Mitigation |
|---------|-----------|
| **API Keys** | Environment variables only — never hardcoded |
| **Passwords** | BCrypt hashed — never stored in plaintext |
| **JWT Tokens** | 7-day expiry, HS256 signed with configurable secret key |
| **File Uploads** | Extension whitelist: `.pdf`, `.png`, `.jpg`, `.jpeg`, `.webp` |
| **CORS** | Restricted to `localhost:3000` in development |
| **SQL Injection** | Prevented by SQLAlchemy ORM parameterized queries |

---

## 🗺️ Roadmap

- [ ] ChromaDB RAG — upload documents and ask questions across an entire knowledge base
- [ ] Activate specialized agents (Coding, Research, Vision, Document, Planner)
- [ ] Streaming responses — token-by-token output like ChatGPT
- [ ] Voice input via Web Speech API
- [ ] PostgreSQL migration for multi-user production deployment
- [ ] Shareable conversation links
- [ ] Export chat history to PDF / Markdown
- [ ] Plugin/tool calling — web search, calculator, code execution
- [ ] Admin dashboard — user management and usage stats
- [ ] Mobile app (React Native)

---

## 🧠 What This Demonstrates

| Area | Implementation |
|------|---------------|
| **Full-Stack AI App** | FastAPI REST backend + Next.js frontend, fully integrated |
| **LLM Integration** | Gemini 2.5 Flash with multi-turn history, file context, and system prompts |
| **Multi-modal AI** | PDF text extraction + image bytes sent directly to Gemini Vision |
| **Auth & Security** | JWT tokens, BCrypt password hashing, protected routes |
| **Persistent Memory** | SQLAlchemy ORM with conversation threading per user |
| **Multi-Agent Design** | Scaffolded agent modules ready to extend with specialized capabilities |
| **Production Patterns** | Dependency injection, Pydantic schema validation, modular routing |
| **Docker Deployment** | Multi-service compose: frontend, backend, PostgreSQL, Redis, ChromaDB |

---

## 📄 License

MIT © 2026 [Yaswanth Kumar](https://github.com/yaswanthkumar)

---

<div align="center">

Built with &nbsp;⚡ FastAPI &nbsp;·&nbsp; 🤖 Gemini 2.5 Flash &nbsp;·&nbsp; ⚛️ Next.js &nbsp;·&nbsp; 🐍 Python &nbsp;·&nbsp; 🐳 Docker

</div>
