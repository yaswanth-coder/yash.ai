import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List


def new_generation_job(
    user_id: str,
    project_id: str,
    workspace: str,
    provider: str,
    model: str,
    input_params: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Creates a new GenerationJob document for async creative generations.
    Statuses: QUEUED, PROCESSING, COMPLETED, FAILED, CANCELLED
    """
    now = datetime.now(timezone.utc)
    job_id = f"job_{uuid.uuid4().hex[:14]}"
    return {
        "_id": job_id,
        "job_id": job_id,
        "user_id": user_id,
        "project_id": project_id,
        "workspace": workspace,      # image, video, 3d, audio, etc.
        "provider": provider,        # pollinations, replicate, stability, etc.
        "model": model,              # flux, sdxl, etc.
        "status": "QUEUED",
        "progress": 0,               # 0-100 percentage
        "input_params": input_params,
        "output_asset_ids": [],
        "output_urls": [],
        "error": None,
        "created_at": now,
        "updated_at": now,
        "completed_at": None,
    }
