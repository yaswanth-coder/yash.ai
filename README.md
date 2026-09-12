<div align="center">

# 🤖 Yash.AI — Personal AI & Creative Intelligence Platform

**Enterprise Full-Stack AI Platform with Multi-Model Intelligence, Create Studio, Long-Term Memory, and Cross-Platform PWA/Android Support**

*Stream token-by-token. Generate media in Create Studio. Manage Project Workspaces. Install anywhere as a Web or Android App.*

[![Python](https://img.shields.io/badge/Python-3.11%2B-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115%2B-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Next.js-16.2-black?style=flat-square&logo=next.js&logoColor=white)](https://nextjs.org)
[![Gemini](https://img.shields.io/badge/Gemini-3.6%20Flash-4285F4?style=flat-square&logo=google&logoColor=white)](https://ai.google.dev)
[![PWA Ready](https://img.shields.io/badge/PWA-Android%20%26%20Web-purple?style=flat-square&logo=android&logoColor=white)](https://web.dev/progressive-web-apps/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker&logoColor=white)](docker-compose.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

[⚡ Quick Start](#-quick-start) · [✨ Features](#-features) · [🎨 Create Studio](#-create-studio) · [🧠 Multi-Model AI](#-multi-model-ai-architecture) · [📱 Web & Android Hosting](#-web--android-app-hosting) · [📡 API Docs](#-api-endpoints)

</div>

---

## ✨ Key Capabilities

- ⚡ **High-Speed SSE Streaming** — Token-by-token real-time generation with sub-100ms first-chunk response time.
- 🧠 **Multi-Provider AI Router** — Seamless fallback across **Google Gemini (3.6 Flash)**, **NVIDIA NIM (Llama 3.3, DeepSeek R1, Nemotron)**, **Ollama Local LLMs**, **Groq**, **OpenAI**, and **Anthropic**.
- 🎨 **Create Studio Workspaces** — Dedicated creative generation hubs for **Images**, **Videos**, **UI/Canvas Design**, **3D Models**, **Code**, **Audio**, **Documents**, and **Deep Research**.
- 📁 **Projects & Context Workspaces** — Attach documents, custom instructions, and organize conversational threads into dedicated projects.
- 💾 **Long-Term Memory & Learning** — Learns user preferences, coding habits, and project context silently over time.
- 📱 **Cross-Platform PWA & Android App** — Installable directly onto Android phones, tablets, and desktops with standalone fullscreen UI and offline service workers.
- 🛡️ **Enterprise Security & Hybrid DB** — JWT Auth, BCrypt password hashing, and auto-switching **MongoDB Atlas** with SQLite fallback.
- 🌐 **Multilingual Auto-Fluency** — Native fluency in Telugu, Hindi, Spanish, French, Japanese, and 50+ languages.

---

## 🎨 Create Studio Suite

Yash.AI includes a unified creative suite accessible from the sidebar:

| Workspace | Route | Capabilities |
| :--- | :--- | :--- |
| 🖼️ **Image Studio** | `/create/image` | Multi-aspect ratio text-to-image, style presets (Cinematic, Anime, Cyberpunk, 3D Render) |
| 🎬 **Video Studio** | `/create/video` | AI video generation, prompt-to-motion synthesis, aspect ratios (16:9, 9:16) |
| ✨ **Design Canvas** | `/create/design` | Interactive infinite canvas, visual node layouts, wireframing |
| 📦 **3D Studio** | `/create/3d` | Text-to-3D asset generation, mesh preview, `.obj`/`.gltf` export |
| 💻 **Code Studio** | `/create/code` | Multi-language code editor, syntax validation, algorithmic problem solving |
| 🎵 **Audio Studio** | `/create/audio` | Text-to-speech synthesis, multi-voice ambient music generation |
| 📄 **Doc Synthesis** | `/create/documents` | Deep PDF analysis, automatic executive summarization, Q&A |
| 🔍 **Deep Research** | `/create/research` | Multi-step agent research with structured citations |

---

## 🧠 Multi-Model AI Architecture

```
                      ┌────────────────────────────────────────┐
                      │        User Prompt / Attachment        │
                      └───────────────────┬────────────────────┘
                                          │
                                          ▼
                      ┌────────────────────────────────────────┐
                      │    Yash.AI Dynamic Provider Router     │
                      └───────┬───────────┬────────────┬───────┘
                              │           │            │
            ┌─────────────────▼┐   ┌──────▼──────┐   ┌─▼────────────────┐
            │ Google Gemini    │   │ Local Ollama│   │ Groq / Anthropic │
            │ (3.6 Flash)      │   │ (Llama/Qwen)│   │ / OpenAI         │
            └──────────────────┘   └─────────────┘   └──────────────────┘
```

The AI router prioritizes high-speed, zero-cost models first and automatically handles failovers and rate limits without breaking user sessions.

---

## ⚡ Quick Start

### Prerequisites
- **Python 3.10+** (Tested on Python 3.11, 3.12, 3.14)
- **Node.js 18+** / **npm**
- (Optional) [Google Gemini API Key](https://aistudio.google.com/)

---

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/yash.AI.git
cd yash.AI
```

---

### 2. Run the Backend API (FastAPI)

```bash
# Navigate to backend folder
cd apps/backend

# Install dependencies
pip install -r requirements.txt

# Start backend server
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
> 📖 **API Docs & Swagger:** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

---

### 3. Run the Frontend (Next.js)

Open a **second terminal**:
```bash
# Navigate to frontend folder
cd apps/yash-frontend

# Install dependencies
npm install

# Start Next.js development server
npm run dev
```
> 🌐 **Live Web App:** [http://localhost:3000/chat](http://localhost:3000/chat)

---

### 4. (Alternative) Run with Docker Compose
To launch MongoDB, Backend, and Frontend all in one command:
```bash
cd yash.AI
docker compose up --build
```

---

## 📱 Web & Android App Hosting

### 🌐 Deploying the Web App (Vercel + Render)

1. **Frontend (Vercel)**:
   - Connect your GitHub repo to [Vercel](https://vercel.com).
   - Set **Root Directory** to `apps/yash-frontend`.
   - Set Environment Variable: `NEXT_PUBLIC_API_URL=https://your-backend.onrender.com`
   - Deploy!

2. **Backend (Render.com / Railway / Fly.io)**:
   - Create a Web Service with **Root Directory** `apps/backend`.
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - Set Environment Variables:
     - `DATABASE_URL=mongodb+srv://...` (Free MongoDB Atlas)
     - `GEMINI_API_KEY=your_gemini_key`
     - `JWT_SECRET=your_secret_key`
     - `CORS_ORIGINS=*`

---

### 📱 Installing on Android Devices

1. **Direct PWA Install (No Store Needed)**:
   - Open your live website on Android in Google Chrome.
   - Tap **Add to Home screen** or **Install App**.
   - Yash.AI installs as a standalone fullscreen app with its own app icon and splash screen.

2. **Generate Native APK (`.apk` / `.aab`)**:
   - Go to [PWABuilder.com](https://www.pwabuilder.com) and enter your live URL.
   - Click **Package for Android** to generate a signed `.apk` or `.aab` for the Google Play Store.
   - Or use the included `capacitor.config.json` via `@capacitor/android`.

---

## 📡 API Endpoints

### 🔐 Authentication (`/auth`)
- `POST /auth/register` — Register a new user account.
- `POST /auth/login` — Authenticate and receive JWT token.
- `GET /auth/me` — Verify authenticated profile.

### 💬 AI Streaming & Chat (`/chat`)
- `POST /chat/` — Standard request-response chat.
- `POST /chat/stream` — Real-time Server-Sent Events (SSE) token stream.

### 📁 Projects & Conversations
- `GET /conversations/` — List active conversation threads.
- `GET /projects/` — List user workspaces.
- `POST /projects/` — Create a project workspace with context documents.

### 🧠 Personas & Memory (`/personas`, `/memory`)
- `GET /personas/` — Available AI specialist agents.
- `GET /memory/` — List stored user habits and context.
- `POST /memory/train` — Run one-time history training.

---

## 🛠️ Technology Stack

| Layer | Technologies Used |
| :--- | :--- |
| **Frontend** | Next.js 16, React 19, TypeScript, Tailwind CSS v4, Lucide Icons |
| **Backend API** | FastAPI, Uvicorn, Pydantic v2, Python-Jose (JWT), BCrypt |
| **AI Providers** | Google GenAI SDK (`gemini-3.6-flash`), NVIDIA NIM, Ollama, Groq, OpenAI, Anthropic |
| **Database** | MongoDB (Motor / PyMongo) + SQLite async fallback |
| **Mobile & PWA** | Web App Manifest, Service Worker (`sw.js`), Capacitor |
| **DevOps** | Docker, Docker Compose, Multi-stage Alpine builds |

---

## 📄 License

Distributed under the **MIT License**. Created by [Yaswanth Kumar](https://github.com/yaswanthkumar).
