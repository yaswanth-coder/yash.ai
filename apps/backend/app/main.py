from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from app.core.config import settings
from app.core.database import setup_indexes
from app.api.auth import router as auth_router
from app.api.chat import router as chat_router
from app.api.conversations import router as conversations_router
from app.api.files import router as files_router
from app.api.memory import router as memory_router
from app.api.providers import router as providers_router
from app.api.projects import router as projects_router
from app.api.scheduled import router as scheduled_router
from app.api.feedback import router as feedback_router
from app.api.user import router as user_router
from app.api.personas import router as personas_router
from app.api.rag import router as rag_router
from app.api.assets import router as assets_router
from app.api.tools_gateway import router as tools_gateway_router
from app.api.generations import router as generations_router
from app.api.canvas import router as canvas_router
from app.core.database import setup_indexes, get_database

import sys
# Reconfigure stdout/stderr to UTF-8 on Windows to safely handle AI emojis
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create MongoDB indexes
    await setup_indexes()
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1|172\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Register all API modules
app.include_router(auth_router)
app.include_router(chat_router)
app.include_router(conversations_router)
app.include_router(files_router)
app.include_router(memory_router)
app.include_router(providers_router)
app.include_router(projects_router)
app.include_router(scheduled_router)
app.include_router(feedback_router)
app.include_router(user_router)
app.include_router(personas_router)
app.include_router(rag_router)
app.include_router(assets_router)
app.include_router(tools_gateway_router)
app.include_router(generations_router)
app.include_router(canvas_router)

@app.get("/")
def home():
    return {
        "message": "Yash.AI Enterprise AI Gateway Running",
        "version": settings.VERSION,
        "database": "MongoDB",
    }

@app.get("/health")
async def health():
    try:
        db = get_database()
        await db.command("ping")
        return {
            "status": "healthy",
            "database": "connected"
        }
    except Exception as ex:
        return {
            "status": "degraded",
            "database": "disconnected",
            "error": str(ex)
        }