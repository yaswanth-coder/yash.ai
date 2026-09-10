import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings
from app.models.sql_models import Base as SqlBase

# Global Motor client
_client: AsyncIOMotorClient = None

# SQLAlchemy setup
DATABASE_URL = getattr(settings, "DATABASE_URL", "sqlite:///./yash.db")
if DATABASE_URL.startswith("sqlite"):
    sql_engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    sql_engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=sql_engine)


def get_client() -> AsyncIOMotorClient:
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(settings.MONGODB_URI)
    return _client


def get_database():
    return get_client()[settings.MONGODB_DB_NAME]


async def setup_indexes():
    """Create necessary indexes and SQL tables on startup."""
    # Initialize SQLAlchemy tables
    try:
        SqlBase.metadata.create_all(bind=sql_engine)
    except Exception as ex:
        print(f"[Database] SQLAlchemy table setup notice: {ex}")

    # Initialize Mongo indexes if motor connected
    try:
        db = get_database()
        await db["users"].create_index("email", unique=True)
        await db["conversations"].create_index("user_id")
        await db["conversations"].create_index([("user_id", 1), ("updated_at", -1)])
        await db["messages"].create_index("conversation_id")
        await db["messages"].create_index([("conversation_id", 1), ("created_at", 1)])
        await db["assets"].create_index("project_id")
        await db["assets"].create_index([("user_id", 1), ("created_at", -1)])
        await db["generation_jobs"].create_index([("user_id", 1), ("created_at", -1)])
        await db["generation_jobs"].create_index("job_id", unique=True)
    except Exception as ex:
        print(f"[Database] Motor setup notice: {ex}")


async def get_db():
    """FastAPI dependency — yields the Motor database handle."""
    yield get_database()


def get_sql_db():
    """FastAPI dependency — yields SQLAlchemy session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()