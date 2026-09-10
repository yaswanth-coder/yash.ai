import asyncio
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from app.core.database import get_database
from app.models.generation_job import new_generation_job
from app.models.asset import new_asset

logger = logging.getLogger("yash.ai.generations.queue")


class GenerationQueueService:
    """
    Asynchronous job executor for expensive creative media workflows.
    Ensures long-running generation jobs do not block browser HTTP threads.
    """

    async def submit_job(
        self,
        user_id: str,
        project_id: str,
        workspace: str,
        provider: str,
        model: str,
        input_params: Dict[str, Any]
    ) -> Dict[str, Any]:
        db = get_database()
        job_doc = new_generation_job(
            user_id=user_id,
            project_id=project_id,
            workspace=workspace,
            provider=provider,
            model=model,
            input_params=input_params
        )
        await db["generation_jobs"].insert_one(job_doc)

        # Launch background processing task
        asyncio.create_task(self._process_job_async(job_doc["job_id"]))

        return job_doc

    async def cancel_job(self, job_id: str, user_id: str) -> bool:
        db = get_database()
        result = await db["generation_jobs"].update_one(
            {"_id": job_id, "user_id": user_id, "status": {"$in": ["QUEUED", "PROCESSING"]}},
            {"$set": {
                "status": "CANCELLED",
                "updated_at": datetime.now(timezone.utc),
                "completed_at": datetime.now(timezone.utc)
            }}
        )
        return result.modified_count > 0

    async def _process_job_async(self, job_id: str):
        """
        Background worker simulation / real adapter execution.
        """
        db = get_database()
        try:
            # 1. Transition to PROCESSING
            await db["generation_jobs"].update_one(
                {"_id": job_id},
                {"$set": {
                    "status": "PROCESSING",
                    "progress": 15,
                    "updated_at": datetime.now(timezone.utc)
                }}
            )

            job = await db["generation_jobs"].find_one({"_id": job_id})
            if not job or job.get("status") == "CANCELLED":
                return

            workspace = job.get("workspace", "image")
            provider = job.get("provider", "pollinations")
            input_params = job.get("input_params", {})
            prompt = input_params.get("prompt", "")

            # If workspace is image, trigger real image generation pipeline
            if workspace == "image":
                await db["generation_jobs"].update_one(
                    {"_id": job_id},
                    {"$set": {"progress": 35, "updated_at": datetime.now(timezone.utc)}}
                )

                from app.services.image_generation import get_image_generation_service
                img_service = get_image_generation_service()

                gen_result = await img_service.generate_and_save_image(
                    user_id=job["user_id"],
                    project_id=job["project_id"],
                    prompt=prompt,
                    negative_prompt=input_params.get("negative_prompt"),
                    aspect_ratio=input_params.get("aspect_ratio", "1:1"),
                    style=input_params.get("style", "Photorealistic"),
                    seed=input_params.get("seed"),
                    model=job.get("model"),
                    provider=job.get("provider")
                )

                now = datetime.now(timezone.utc)
                await db["generation_jobs"].update_one(
                    {"_id": job_id},
                    {"$set": {
                        "status": "COMPLETED",
                        "progress": 100,
                        "output_asset_ids": [gen_result["asset_id"]],
                        "output_urls": [gen_result["url"]],
                        "updated_at": now,
                        "completed_at": now
                    }}
                )
                return

            # Simulate progressive rendering stages with real completion for other workspaces
            await asyncio.sleep(0.5)
            await db["generation_jobs"].update_one(
                {"_id": job_id},
                {"$set": {"progress": 50, "updated_at": datetime.now(timezone.utc)}}
            )

            await asyncio.sleep(0.5)
            await db["generation_jobs"].update_one(
                {"_id": job_id},
                {"$set": {"progress": 85, "updated_at": datetime.now(timezone.utc)}}
            )

            # Check if cancelled during render
            current_job = await db["generation_jobs"].find_one({"_id": job_id})
            if current_job.get("status") == "CANCELLED":
                return

            # Generate asset output
            now = datetime.now(timezone.utc)
            asset_type = workspace.upper()
            if asset_type not in ("IMAGE", "VIDEO", "AUDIO", "MODEL_3D", "DOCUMENT", "CODE", "CANVAS"):
                asset_type = "OTHER"

            # Create asset document
            safe_title = f"{workspace.capitalize()} Output - {job_id[:8]}"
            output_url = input_params.get("image_url") or f"/assets/raw/generated_{job_id}.png"
            
            asset_doc = new_asset(
                user_id=job["user_id"],
                project_id=job["project_id"],
                asset_type=asset_type,
                name=safe_title,
                storage_key=f"projects/{job['project_id']}/assets/{job_id}.png",
                url=output_url,
                provider=provider,
                model=job["model"],
                prompt=prompt,
                metadata=input_params
            )
            await db["assets"].insert_one(asset_doc)

            # Mark COMPLETED
            await db["generation_jobs"].update_one(
                {"_id": job_id},
                {"$set": {
                    "status": "COMPLETED",
                    "progress": 100,
                    "output_asset_ids": [asset_doc["_id"]],
                    "output_urls": [output_url],
                    "updated_at": now,
                    "completed_at": now
                }}
            )

        except Exception as e:
            logger.error(f"[GenerationQueue] Error processing job {job_id}: {e}", exc_info=True)
            await db["generation_jobs"].update_one(
                {"_id": job_id},
                {"$set": {
                    "status": "FAILED",
                    "error": str(e),
                    "updated_at": datetime.now(timezone.utc),
                    "completed_at": datetime.now(timezone.utc)
                }}
            )


_global_queue_service = GenerationQueueService()


def get_generation_queue() -> GenerationQueueService:
    return _global_queue_service
