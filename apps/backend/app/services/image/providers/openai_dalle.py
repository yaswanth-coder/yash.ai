import os
import io
import asyncio
import logging
import base64
import urllib.request
from typing import List, Optional
from app.core.config import settings
from app.services.image.base import (
    BaseImageProvider,
    ImageGenerationTask,
    ImageEditTask,
    ImageVariationTask,
    GeneratedImage
)
from app.services.image.capabilities import ImageCapability

logger = logging.getLogger("yash.ai.image.openai")


class OpenAIDalleProvider(BaseImageProvider):
    """
    OpenAI DALL-E Adapter (DALL-E 3 and DALL-E 2).
    Provides state-of-the-art visual composition and official inpainting/variation APIs.
    """
    provider_id = "openai"
    name = "OpenAI DALL-E"

    def _get_api_key(self) -> str:
        return getattr(settings, "OPENAI_API_KEY", None) or os.getenv("OPENAI_API_KEY", "").strip()

    def is_configured(self) -> bool:
        return bool(self._get_api_key())

    def get_capabilities(self) -> List[ImageCapability]:
        configured = self.is_configured()
        return [
            ImageCapability(
                model_id="openai:dall-e-3",
                name="DALL-E 3 (Ultra Creative & Accurate)",
                provider="openai",
                description="OpenAI flagship text-to-image model with superb prompt adherence.",
                is_available=configured,
                text_to_image=True,
                image_to_image=False,
                inpainting=False,
                outpainting=False,
                variations=False,
                upscale=False,
                negative_prompt=False,
                seed=False,
                multiple_images=False,
                reference_images=False,
                supported_aspect_ratios=["1:1", "16:9", "9:16"],
                max_resolution=1792
            ),
            ImageCapability(
                model_id="openai:dall-e-2",
                name="DALL-E 2 (Editing, Inpainting & Variations)",
                provider="openai",
                description="Supports image mask inpainting, object replacement, and multiple variations.",
                is_available=configured,
                text_to_image=True,
                image_to_image=True,
                inpainting=True,
                outpainting=True,
                variations=True,
                upscale=False,
                negative_prompt=False,
                seed=False,
                multiple_images=True,
                reference_images=True,
                supported_aspect_ratios=["1:1"],
                max_resolution=1024
            )
        ]

    async def generate(self, task: ImageGenerationTask) -> List[GeneratedImage]:
        api_key = self._get_api_key()
        if not api_key:
            raise RuntimeError("OpenAI API key is not configured.")

        model_name = (task.model or "dall-e-3").replace("openai:", "")
        if model_name not in ("dall-e-3", "dall-e-2"):
            model_name = "dall-e-3"

        # Aspect ratio to dimensions
        if model_name == "dall-e-3":
            if task.aspect_ratio == "16:9":
                size = "1792x1024"
                width, height = 1792, 1024
            elif task.aspect_ratio == "9:16":
                size = "1024x1792"
                width, height = 1024, 1792
            else:
                size = "1024x1024"
                width, height = 1024, 1024
            n = 1
        else:
            size = "1024x1024"
            width, height = 1024, 1024
            n = min(task.num_images, 4)

        payload = {
            "model": model_name,
            "prompt": task.prompt,
            "n": n,
            "size": size,
            "response_format": "b64_json"
        }

        def _call_api():
            import json
            req = urllib.request.Request(
                "https://api.openai.com/v1/images/generations",
                data=json.dumps(payload).encode("utf-8"),
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {api_key}"
                }
            )
            with urllib.request.urlopen(req, timeout=60) as resp:
                return json.loads(resp.read().decode("utf-8"))

        data = await asyncio.to_thread(_call_api)
        results = []
        for item in data.get("data", []):
            b64_str = item.get("b64_json")
            if b64_str:
                img_bytes = base64.b64decode(b64_str)
                results.append(
                    GeneratedImage(
                        image_bytes=img_bytes,
                        mime_type="image/png",
                        width=width,
                        height=height,
                        provider="openai",
                        model=model_name,
                        metadata={"revised_prompt": item.get("revised_prompt", "")}
                    )
                )

        return results

    async def edit(self, task: ImageEditTask) -> GeneratedImage:
        api_key = self._get_api_key()
        if not api_key:
            raise RuntimeError("OpenAI API key is not configured for inpainting.")

        import httpx
        url = "https://api.openai.com/v1/images/edits"
        files = {
            "image": ("image.png", task.image_bytes, "image/png"),
            "prompt": (None, task.prompt),
            "model": (None, "dall-e-2"),
            "n": (None, "1"),
            "size": (None, "1024x1024"),
            "response_format": (None, "b64_json")
        }
        if task.mask_bytes:
            files["mask"] = ("mask.png", task.mask_bytes, "image/png")

        headers = {"Authorization": f"Bearer {api_key}"}

        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(url, files=files, headers=headers)
            if resp.status_code != 200:
                raise RuntimeError(f"OpenAI edit failed: {resp.text}")
            res_json = resp.json()
            b64_str = res_json["data"][0]["b64_json"]
            img_bytes = base64.b64decode(b64_str)
            return GeneratedImage(
                image_bytes=img_bytes,
                mime_type="image/png",
                width=1024,
                height=1024,
                provider="openai",
                model="dall-e-2",
                metadata={"action": task.action_type}
            )

    async def variation(self, task: ImageVariationTask) -> List[GeneratedImage]:
        api_key = self._get_api_key()
        if not api_key:
            raise RuntimeError("OpenAI API key is not configured.")

        import httpx
        url = "https://api.openai.com/v1/images/variations"
        files = {
            "image": ("image.png", task.image_bytes, "image/png"),
            "n": (None, str(min(task.num_variations, 4))),
            "size": (None, "1024x1024"),
            "response_format": (None, "b64_json")
        }
        headers = {"Authorization": f"Bearer {api_key}"}

        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(url, files=files, headers=headers)
            if resp.status_code != 200:
                raise RuntimeError(f"OpenAI variations failed: {resp.text}")
            res_json = resp.json()
            out = []
            for item in res_json.get("data", []):
                img_bytes = base64.b64decode(item["b64_json"])
                out.append(
                    GeneratedImage(
                        image_bytes=img_bytes,
                        mime_type="image/png",
                        width=1024,
                        height=1024,
                        provider="openai",
                        model="dall-e-2"
                    )
                )
            return out
