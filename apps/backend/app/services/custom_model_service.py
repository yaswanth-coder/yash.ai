import uuid
import logging
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from app.core.database import get_database, SessionLocal
from app.models.sql_models import SqlCustomModel

logger = logging.getLogger("yash.ai.custom_models")


def mask_key(key: str) -> str:
    if not key or len(key) <= 8:
        return "********"
    return f"{key[:4]}...{key[-4:]}"


async def add_custom_model(
    model_id: str,
    name: str,
    base_url: str,
    api_key: str,
    context_window: int = 128000,
    description: str = "",
    user_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Register or update a custom model configuration."""
    model_id = model_id.strip()
    # Normalize model ID: ensure it doesn't conflict
    clean_id = model_id if ":" in model_id else f"custom:{model_id}"
    base_url = base_url.strip().rstrip("/")

    now = datetime.now(timezone.utc)
    doc = {
        "_id": str(uuid.uuid4()),
        "model_id": clean_id,
        "name": name.strip(),
        "base_url": base_url,
        "api_key": api_key.strip(),
        "context_window": int(context_window),
        "description": description.strip() or f"Custom model ({clean_id})",
        "user_id": user_id,
        "created_at": now.isoformat(),
    }

    # 1. Try MongoDB
    try:
        db = get_database()
        await db["custom_models"].update_one(
            {"model_id": clean_id},
            {"$set": doc},
            upsert=True,
        )
        return {**doc, "api_key": mask_key(doc["api_key"])}
    except Exception as ex:
        logger.warning(f"MongoDB unavailable for custom model, trying SQLite: {ex}")

    # 2. Fallback to SQLite
    try:
        with SessionLocal() as session:
            existing = session.query(SqlCustomModel).filter_by(model_id=clean_id).first()
            if existing:
                existing.name = doc["name"]
                existing.base_url = doc["base_url"]
                existing.api_key = doc["api_key"]
                existing.context_window = doc["context_window"]
                existing.description = doc["description"]
            else:
                new_entry = SqlCustomModel(
                    id=doc["_id"],
                    user_id=user_id,
                    model_id=clean_id,
                    name=doc["name"],
                    base_url=doc["base_url"],
                    api_key=doc["api_key"],
                    context_window=doc["context_window"],
                    description=doc["description"],
                    created_at=now,
                )
                session.add(new_entry)
            session.commit()
            return {**doc, "api_key": mask_key(doc["api_key"])}
    except Exception as ex:
        logger.error(f"Failed to persist custom model: {ex}")
        raise RuntimeError(f"Could not save custom model: {ex}")


async def get_custom_models(mask_keys: bool = True) -> List[Dict[str, Any]]:
    """Retrieve all custom models."""
    results = []
    # 1. Try MongoDB
    try:
        db = get_database()
        cursor = db["custom_models"].find({})
        async for doc in cursor:
            res = {
                "id": doc.get("model_id"),
                "model_id": doc.get("model_id"),
                "name": doc.get("name"),
                "base_url": doc.get("base_url"),
                "api_key": mask_key(doc.get("api_key", "")) if mask_keys else doc.get("api_key", ""),
                "context_window": doc.get("context_window", 128000),
                "description": doc.get("description", ""),
                "is_custom": True,
            }
            results.append(res)
        if results:
            return results
    except Exception as ex:
        logger.debug(f"MongoDB read notice: {ex}")

    # 2. Fallback to SQLite
    try:
        with SessionLocal() as session:
            rows = session.query(SqlCustomModel).all()
            for r in rows:
                results.append(
                    {
                        "id": r.model_id,
                        "model_id": r.model_id,
                        "name": r.name,
                        "base_url": r.base_url,
                        "api_key": mask_key(r.api_key) if mask_keys else r.api_key,
                        "context_window": r.context_window,
                        "description": r.description,
                        "is_custom": True,
                    }
                )
    except Exception as ex:
        logger.debug(f"SQLite read notice: {ex}")

    return results


async def get_custom_model_by_id(model_id: str) -> Optional[Dict[str, Any]]:
    """Fetch a single custom model with its unmasked API key for execution."""
    clean_id = model_id.strip()

    # Try MongoDB
    try:
        db = get_database()
        doc = await db["custom_models"].find_one(
            {"$or": [{"model_id": clean_id}, {"model_id": f"custom:{clean_id}"}]}
        )
        if doc:
            return {
                "model_id": doc["model_id"],
                "name": doc["name"],
                "base_url": doc["base_url"],
                "api_key": doc["api_key"],
                "context_window": doc.get("context_window", 128000),
                "description": doc.get("description", ""),
            }
    except Exception:
        pass

    # Try SQLite
    try:
        with SessionLocal() as session:
            r = (
                session.query(SqlCustomModel)
                .filter(
                    (SqlCustomModel.model_id == clean_id)
                    | (SqlCustomModel.model_id == f"custom:{clean_id}")
                )
                .first()
            )
            if r:
                return {
                    "model_id": r.model_id,
                    "name": r.name,
                    "base_url": r.base_url,
                    "api_key": r.api_key,
                    "context_window": r.context_window,
                    "description": r.description,
                }
    except Exception:
        pass

    return None


async def delete_custom_model(model_id: str) -> bool:
    """Delete a custom model."""
    clean_id = model_id.strip()
    deleted = False

    try:
        db = get_database()
        res = await db["custom_models"].delete_many(
            {"$or": [{"model_id": clean_id}, {"model_id": f"custom:{clean_id}"}]}
        )
        if res.deleted_count > 0:
            deleted = True
    except Exception:
        pass

    try:
        with SessionLocal() as session:
            rows = (
                session.query(SqlCustomModel)
                .filter(
                    (SqlCustomModel.model_id == clean_id)
                    | (SqlCustomModel.model_id == f"custom:{clean_id}")
                )
                .all()
            )
            if rows:
                for row in rows:
                    session.delete(row)
                session.commit()
                deleted = True
    except Exception:
        pass

    return deleted
