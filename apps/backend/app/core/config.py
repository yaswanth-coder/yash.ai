import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    PROJECT_NAME: str = "Yash.AI"
    VERSION: str = "1.0.0"
    API_V1_STR: str = ""
    
    # Gemini
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")

    # NVIDIA
    NVIDIA_API_KEY: str = os.getenv("NVIDIA_API_KEY", "")

    # xKiro / Custom API
    XKIRO_API_KEY: str = os.getenv("XKIRO_API_KEY", "")
    XKIRO_BASE_URL: str = os.getenv("XKIRO_BASE_URL", "https://api.xkiro.com/v1")
    XKIRO_MODEL: str = os.getenv("XKIRO_MODEL", "xkiro-v1")

    # xAI (Grok)
    XAI_API_KEY: str = os.getenv("XAI_API_KEY", "")
    
    # MongoDB
    MONGODB_URI: str = os.getenv("MONGODB_URI", "mongodb+srv://yashai_render:<4dxHFERXar9s8f4L>@cluster0.p1jzks2.mongodb.net/?appName=Cluster0")
    MONGODB_DB_NAME: str = os.getenv("MONGODB_DB_NAME", "yash_ai")
    
    # Security
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "yash-ai-secret-key-change-in-prod-2026")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_DAYS: int = 7

settings = Settings()
