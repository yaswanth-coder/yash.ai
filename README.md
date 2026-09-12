<div align="center">

# 🤖 Yash.AI — Personal AI & Creative Intelligence Platform

**Enterprise Full-Stack AI Platform with Multi-Model Intelligence, Create Studio, Long-Term Memory, and Cross-Platform Mobile/PWA/Android Support**

*Stream token-by-token. Generate media in Create Studio. Manage Project Workspaces. Install anywhere as a Web, PWA, or Android App.*

[![Python](https://img.shields.io/badge/Python-3.11%2B-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115%2B-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Next.js-16.2-black?style=flat-square&logo=next.js&logoColor=white)](https://nextjs.org)
[![Gemini](https://img.shields.io/badge/Gemini-3.6%20Flash-4285F4?style=flat-square&logo=google&logoColor=white)](https://ai.google.dev)
[![NVIDIA NIM](https://img.shields.io/badge/NVIDIA-NIM%20API-76B900?style=flat-square&logo=nvidia&logoColor=white)](https://build.nvidia.com)
[![Mobile Ready](https://img.shields.io/badge/Mobile-iOS%20%26%20Android-purple?style=flat-square&logo=android&logoColor=white)](https://web.dev/progressive-web-apps/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker&logoColor=white)](docker-compose.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

[⚡ Quick Start](#-quick-start) · [✨ Features](#-key-capabilities) · [🎨 Create Studio](#-create-studio-suite) · [🧠 Multi-Model AI](#-multi-model-ai-architecture) · [📱 Mobile App](#-mobile--cross-platform) · [📡 API Docs](#-api-endpoints)

</div>

---

## ✨ Key Capabilities

- ⚡ **High-Speed SSE Streaming** — Token-by-token real-time generation with sub-100ms first-chunk response time.
- 🧠 **Multi-Provider AI Router** — Seamless fallback across **Google Gemini (3.6 Flash)**, **NVIDIA NIM** (Llama 3.3, DeepSeek R1, Nemotron), **Ollama Local LLMs**, **Groq**, **OpenAI**, **Anthropic Claude**, and **Custom / xKiro models**.
- 🎨 **Create Studio Workspaces** — Dedicated creative hubs for **Images**, **Videos**, **UI/Canvas Design**, **3D Models**, **Code**, **Audio**, **Documents**, and **Deep Research**.
- 📁 **Projects & Context Workspaces** — Attach documents, custom instructions, and organize threads into dedicated project workspaces.
- 💾 **Long-Term Memory & Learning** — Learns user preferences, coding habits, and project context silently over time.
- 📱 **Fully Responsive Mobile UI** — Native-feel mobile app experience on Android & iOS, tablet-adaptive layouts, and full desktop website — all in one codebase.
- 🛡️ **Enterprise Security & Hybrid DB** — JWT Auth, BCrypt password hashing, and auto-switching **MongoDB Atlas** with SQLite fallback.
- 🌐 **Multilingual Auto-Fluency** — Native fluency in Telugu, Hindi, Spanish, French, Japanese, and 50+ languages.
- 🔧 **Bring Your Own Model** — Add any custom model via UI by providing an API endpoint, model ID, and key (xKiro, OpenAI-compatible, NVIDIA NIM).

---

## 🎨 Create Studio Suite

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
                      ┌────────────────────────────────────────────┐
                      │        User Prompt / File Attachment        │
                      └──────────────────┬─────────────────────────┘
                                         │
                                         ▼
                      ┌────────────────────────────────────────────┐
                      │      Yash.AI Dynamic Provider Router       │
                      │  (auto-fallback · cooldown · rate-limits)  │
                      └──┬──────────┬──────────┬────────┬──────────┘
                         │          │          │        │
             ┌───────────▼┐  ┌──────▼──────┐  │  ┌─────▼────────────┐
             │ Gemini 3.6 │  │ NVIDIA NIM  │  │  │ Groq / Anthropic │
             │   Flash    │  │ Llama/DeepR │  │  │ Claude / OpenAI  │
             └────────────┘  └─────────────┘  │  └──────────────────┘
                                               │
                                    ┌──────────▼──────────┐
                                    │  Custom / xKiro /   │
                                    │  Ollama Local LLMs  │
                                    └─────────────────────┘
```

The router prioritizes high-speed zero-cost models first and automatically handles failovers and rate limits without breaking sessions.

### Supported Providers

| Provider | Example Models | Env Variable |
| :--- | :--- | :--- |
| **Google Gemini** | `gemini-3.6-flash`, `gemini-flash-latest` | `GEMINI_API_KEY` |
| **NVIDIA NIM** | `meta/llama-3.3-70b-instruct`, `deepseek-ai/deepseek-r1`, `nvidia/nemotron-4-340b` | `NVIDIA_API_KEY` |
| **Anthropic** | `claude-3-5-sonnet-20241022`, `claude-3-5-haiku-20241022` | `ANTHROPIC_API_KEY` |
| **Groq** | `llama-3.3-70b-versatile`, `mixtral-8x7b-32768` | `GROQ_API_KEY` |
| **OpenAI** | `gpt-4o`, `gpt-4o-mini` | `OPENAI_API_KEY` |
| **Ollama** | `llama3.2`, `qwen2.5`, any local model | *(no key — local)* |
| **Custom / xKiro** | Any OpenAI-compatible endpoint | Set via UI → Settings → Models |

---

## 📱 Mobile & Cross-Platform

Yash.AI is a **fully responsive application** that automatically adapts to every screen:

| Device | Experience |
| :--- | :--- |
| 📱 **Android / iPhone** | Native-feel mobile layout with bottom navigation bar, touch-optimised controls, no horizontal scroll |
| 🗂️ **Tablet (iPad / Android)** | Side-panel navigation, adaptive card grids |
| 💻 **Desktop / Web** | Full sidebar, keyboard shortcuts, widescreen chat layout |

**Mobile-specific implementations:**
- Bottom tab `MobileNav` component with haptic-ready touch targets
- iOS input zoom prevention (all inputs forced ≥ 16px on focus)
- Safe-area insets for notched devices (`env(safe-area-inset-*)`)
- Dynamic viewport height (`dvh`) to handle mobile browser chrome
- Fully installable as a **PWA** — add directly to home screen from Chrome or Safari

---

## ⚡ Quick Start

### Prerequisites
- **Python 3.10+** (tested on 3.11, 3.12, 3.14)
- **Node.js 18+** / **npm**
- At least one AI provider API key (Gemini recommended — free tier available)

---

### 1. Clone the Repository

```bash
git clone https://github.com/yaswanth-coder/yash.ai.git
cd yash.ai
```

---

### 2. Configure Environment Variables

```bash
cp apps/backend/.env.example apps/backend/.env
```

Edit `apps/backend/.env`:

```env
# ── AI Provider Keys (at least one required) ──────────────────────
GEMINI_API_KEY=your_gemini_api_key
NVIDIA_API_KEY=your_nvidia_nim_key        # optional
ANTHROPIC_API_KEY=your_anthropic_key      # optional
GROQ_API_KEY=your_groq_key                # optional
OPENAI_API_KEY=your_openai_key            # optional

# ── Auth & Database ───────────────────────────────────────────────
JWT_SECRET=your_secret_key_here
DATABASE_URL=mongodb+srv://...            # optional — SQLite used if omitted
CORS_ORIGINS=http://localhost:3000

# ── AI Router Priority (comma-separated) ─────────────────────────
AI_PROVIDER_PRIORITY=gemini,nvidia,groq,anthropic,openai,ollama
```

---

### 3. Run the Backend (FastAPI)

```bash
cd apps/backend
pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.1 --port 8000 --reload
```

> 📖 **Swagger API Docs:** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

---

### 4. Run the Frontend (Next.js)

Open a **second terminal**:

```bash
cd apps/yash-frontend
npm install
npm run dev
```

> 🌐 **Live App:** [http://localhost:3000/chat](http://localhost:3000/chat)

---

### 5. (Alternative) Docker Compose

```bash
docker compose up --build
```

---

## 🔧 Adding Custom Models

1. Open Yash.AI → **Settings** → **Models** tab.
2. Click **Add Model** and enter:
   - **Model ID** — e.g. `meta/llama-3.3-70b-instruct`
   - **API Endpoint** — e.g. `https://integrate.api.nvidia.com/v1`
   - **API Key** — your provider key
3. **Save** — the model instantly appears in the model selector in any chat.

> xKiro models use the `xkiro:` prefix and route through the custom provider automatically.

---

## 📦 Deploying to Production

### Frontend → Vercel
1. Connect your GitHub repo to [Vercel](https://vercel.com).
2. Set **Root Directory** to `apps/yash-frontend`.
3. Add env var: `NEXT_PUBLIC_API_URL=https://your-backend.onrender.com`
4. Deploy.

### Backend → Render / Railway / Fly.io
- **Root Directory:** `apps/backend`
- **Build Command:** `pip install -r requirements.txt`
- **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Add the same env vars from `.env`

### 📱 Android APK
- [PWABuilder.com](https://www.pwabuilder.com) → enter your live URL → **Package for Android**
- Or use the included `capacitor.config.json` with `@capacitor/android`

---

## 📡 API Endpoints

### 🔐 Authentication (`/auth`)
- `POST /auth/register` — Register a new user account.
- `POST /auth/login` — Authenticate and receive JWT token.
- `GET /auth/me` — Verify authenticated profile.

### 💬 AI Chat (`/chat`)
- `POST /chat/` — Standard request-response chat.
- `POST /chat/stream` — Real-time SSE token streaming.

### 📁 Projects & Conversations
- `GET /conversations/` — List active conversation threads.
- `GET /projects/` — List user workspaces.
- `POST /projects/` — Create a project workspace.

### 🧠 Memory & Personas
- `GET /personas/` — Available AI specialist agents.
- `GET /memory/` — List stored user memory and context.
- `POST /memory/train` — Run one-time history training.

### 🤖 Providers
- `GET /providers/models` — List all available models across providers.
- `GET /providers/health` — Real-time health status of all providers.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | Next.js 16, React 19, TypeScript, Tailwind CSS v4, Lucide Icons |
| **Mobile / PWA** | Responsive CSS (`dvh`, safe-area insets), MobileNav component, Capacitor |
| **Backend API** | FastAPI, Uvicorn, Pydantic v2, Python-Jose (JWT), BCrypt |
| **AI Providers** | Google GenAI SDK, NVIDIA NIM, Ollama, Groq SDK, OpenAI SDK, httpx (Anthropic) |
| **Database** | MongoDB Motor (async) + SQLite fallback |
| **DevOps** | Docker, Docker Compose, multi-stage Alpine builds |

---

## 📄 License

Distributed under the **MIT License**. Created by [Yaswanth Kumar](https://github.com/yaswanth-coder).
