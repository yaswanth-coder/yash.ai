import os
import urllib.parse
import urllib.request
import asyncio
import logging
from typing import Dict, Any, Optional
from datetime import datetime, timezone
from app.core.database import get_database
from app.services.storage.factory import get_storage_provider
from app.models.asset import new_asset

logger = logging.getLogger("yash.ai.image_generation")


class ImageGenerationService:
    """
    Multi-provider generative image backend.
    Supports Gemini Imagen, OpenAI DALL-E, and free Pollinations AI fallback.
    Automatically persists generated images into the active project asset store.
    """

    def __init__(self):
        self.storage = get_storage_provider()

    async def generate_and_save_image(
        self,
        user_id: str,
        project_id: str,
        prompt: str,
        negative_prompt: Optional[str] = None,
        aspect_ratio: str = "1:1",
        style: str = "Photorealistic",
        seed: Optional[int] = None,
        model: Optional[str] = None,
        provider: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Synthesizes an image, streams its bytes, uploads to IStorageProvider,
        and records a new AssetModel in MongoDB.
        """
        # 1. Resolve dimensions based on aspect ratio
        width, height = self._resolve_dimensions(aspect_ratio)

        # 2. Build augmented prompt
        augmented_prompt = prompt.strip()
        if style and style.lower() != "none":
            augmented_prompt += f", {style} style, high quality, 8k resolution, detailed"
        if negative_prompt and negative_prompt.strip():
            augmented_prompt += f" --no {negative_prompt.strip()}"

        # 3. Generate image bytes via image_router with Gemini default
        image_bytes = None
        used_provider = provider or "gemini"
        used_model = model or "gemini:imagen-3.0"

        try:
            from app.services.image.router import image_router
            from app.services.image.base import ImageGenerationTask
            task = ImageGenerationTask(
                prompt=prompt,
                negative_prompt=negative_prompt,
                aspect_ratio=aspect_ratio,
                style=style,
                seed=seed,
                num_images=1,
                model=model or (f"{provider}:{model}" if provider else None)
            )
            results = await image_router.generate(task)
            if results:
                image_bytes = results[0].image_bytes
                used_provider = results[0].provider
                used_model = results[0].model
        except Exception as e:
            logger.warning(f"ImageProviderRouter generation failed: {e}. Falling back to native Pollinations.")
            image_bytes, used_provider, used_model = await self._generate_pollinations(
                prompt=augmented_prompt,
                width=width,
                height=height,
                seed=seed,
                model=used_model
            )

        if not image_bytes:
            raise RuntimeError("Failed to generate image from providers.")

        # 4. Upload to persistent storage (Local or S3)
        timestamp_str = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        filename = f"gen_{timestamp_str}_{width}x{height}.png"
        content_type = "image/png"
        storage_key = f"projects/{project_id}/assets/{filename}"

        import io
        download_url = await self.storage.upload(
            file_obj=io.BytesIO(image_bytes),
            storage_key=storage_key,
            content_type=content_type
        )

        # 5. Persist AssetModel in MongoDB
        db = get_database()
        title_summary = prompt[:40] + ("..." if len(prompt) > 40 else "")
        asset_doc = new_asset(
            user_id=user_id,
            project_id=project_id,
            asset_type="IMAGE",
            name=f"Image: {title_summary}",
            storage_key=storage_key,
            url=download_url,
            mime_type=content_type,
            size_bytes=len(image_bytes),
            provider=used_provider,
            model=used_model,
            prompt=prompt,
            metadata={
                "aspect_ratio": aspect_ratio,
                "width": width,
                "height": height,
                "style": style,
                "seed": seed,
                "negative_prompt": negative_prompt,
                "augmented_prompt": augmented_prompt
            }
        )

        await db["assets"].insert_one(asset_doc)
        logger.info(f"Generated and persisted asset {asset_doc['_id']} for project {project_id}")

        return {
            "asset_id": asset_doc["_id"],
            "url": upload_result["download_url"],
            "name": asset_doc["name"],
            "width": width,
            "height": height,
            "provider": used_provider,
            "model": used_model
        }

    def _resolve_dimensions(self, aspect_ratio: str) -> tuple[int, int]:
        mapping = {
            "1:1": (1024, 1024),
            "16:9": (1280, 720),
            "9:16": (720, 1280),
            "4:3": (1024, 768),
            "3:4": (768, 1024),
            "3:2": (1080, 720),
            "2:3": (720, 1080)
        }
        return mapping.get(aspect_ratio, (1024, 1024))

    async def _generate_pollinations(
        self,
        prompt: str,
        width: int,
        height: int,
        seed: Optional[int] = None,
        model: str = "flux"
    ) -> tuple[bytes, str, str]:
        """
        Pollinations AI generator (High-speed, zero-API-key requirement for dev/prod).
        """
        encoded_prompt = urllib.parse.quote(prompt)
        url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width={width}&height={height}&model={model}&nologo=true"
        if seed is not None:
            url += f"&seed={seed}"

        def _fetch_url(target_url: str) -> bytes:
            req = urllib.request.Request(
                target_url,
                headers={"User-Agent": "Yash.AI/1.0 (Creative Platform Engine)"}
            )
            with urllib.request.urlopen(req, timeout=40) as response:
                return response.read()

        try:
            image_data = await asyncio.to_thread(_fetch_url, url)
            return image_data, "pollinations", model
        except Exception as e:
            logger.warning(f"Pollinations fetch failed: {e}. Generating fallback procedural SVG banner.")
            # Fallback procedural SVG if network is completely disconnected
            svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">
                <defs>
                    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stop-color="#1e1b4b" />
                        <stop offset="50%" stop-color="#312e81" />
                        <stop offset="100%" stop-color="#4c1d95" />
                    </linearGradient>
                </defs>
                <rect width="100%" height="100%" fill="url(#g)" />
                <circle cx="{width//2}" cy="{height//2}" r="{min(width, height)//4}" fill="#6366f1" opacity="0.4" />
                <text x="50%" y="45%" dominant-baseline="middle" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-weight="bold" font-size="24">Yash.AI Visual Synthesis</text>
                <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" fill="#a5b4fc" font-family="sans-serif" font-size="16">{prompt[:50]}</text>
            </svg>""".encode("utf-8")
            return svg, "procedural", "fallback"


# Singleton instance
_image_generation_service: Optional[ImageGenerationService] = None


def get_image_generation_service() -> ImageGenerationService:
    global _image_generation_service
    if _image_generation_service is None:
        _image_generation_service = ImageGenerationService()
    return _image_generation_service
