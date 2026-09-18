import urllib.parse
import urllib.request
import asyncio
import logging
import random
from typing import List, Optional
from app.services.image.base import BaseImageProvider, ImageGenerationTask, GeneratedImage
from app.services.image.capabilities import ImageCapability

logger = logging.getLogger("yash.ai.image.pollinations")


class PollinationsImageProvider(BaseImageProvider):
    """
    Pollinations AI Adapter.
    Provides ultra-reliable, zero-API-key image generation (Flux, Flux-Realism, Anime, 3D, Turbo).
    Guarantees that Yash.AI Image Studio is immediately functional without external billing setup.
    """
    provider_id = "pollinations"
    name = "Pollinations AI (Flux Engine)"

    MODELS = {
        "flux": "Flux.1 Fast (Photorealistic & Hyper-detailed)",
        "flux-realism": "Flux Realism (Cinematic Photography & Portraits)",
        "flux-anime": "Flux Anime (Japanese Anime & Manga Art)",
        "flux-3d": "Flux 3D (3D CGI, Pixar & Octane Render)",
        "turbo": "SDXL Turbo (High-speed Instant Generation)"
    }

    def is_configured(self) -> bool:
        # Zero-API key requirement — always ready
        return True

    def get_capabilities(self) -> List[ImageCapability]:
        capabilities = []
        for model_id, model_name in self.MODELS.items():
            capabilities.append(
                ImageCapability(
                    model_id=f"pollinations:{model_id}",
                    name=f"{model_name}",
                    provider="pollinations",
                    description="Open-access generative engine with instant synthesis.",
                    is_available=True,
                    text_to_image=True,
                    image_to_image=False,
                    inpainting=False,
                    outpainting=False,
                    variations=True,
                    upscale=False,
                    negative_prompt=True,
                    seed=True,
                    multiple_images=True,
                    reference_images=False,
                    supported_aspect_ratios=["1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3", "21:9"],
                    max_resolution=1440
                )
            )
        return capabilities

    async def generate(self, task: ImageGenerationTask) -> List[GeneratedImage]:
        model_name = (task.model or "flux").replace("pollinations:", "").strip()
        if model_name not in self.MODELS:
            model_name = "flux"

        num_images = max(1, min(4, task.num_images))
        base_seed = task.seed if task.seed is not None else random.randint(1000, 2147483647)

        results: List[GeneratedImage] = []

        async def _fetch_single(img_seed: int) -> Optional[GeneratedImage]:
            prompt_text = task.prompt.strip()
            if task.style and task.style.lower() != "none":
                prompt_text += f", {task.style} visual aesthetic"
            if task.negative_prompt and task.negative_prompt.strip():
                prompt_text += f" --no {task.negative_prompt.strip()}"

            encoded_prompt = urllib.parse.quote(prompt_text)
            url = (
                f"https://image.pollinations.ai/prompt/{encoded_prompt}"
                f"?width={task.width}&height={task.height}&model={model_name}&seed={img_seed}&nologo=true"
            )

            def _req() -> bytes:
                request = urllib.request.Request(
                    url,
                    headers={"User-Agent": "Yash.AI-Studio/2.0 (Generative Intelligence)"}
                )
                with urllib.request.urlopen(request, timeout=45) as resp:
                    return resp.read()

            try:
                img_data = await asyncio.to_thread(_req)
                return GeneratedImage(
                    image_bytes=img_data,
                    mime_type="image/png",
                    width=task.width,
                    height=task.height,
                    seed=img_seed,
                    provider="pollinations",
                    model=model_name,
                    metadata={"aspect_ratio": task.aspect_ratio, "prompt": prompt_text}
                )
            except Exception as e:
                logger.error(f"[Pollinations] Generation failed for seed {img_seed}: {e}")
                return None

        # Fetch parallel images if num_images > 1
        seeds = [base_seed + i * 1337 for i in range(num_images)]
        tasks = [_fetch_single(s) for s in seeds]
        fetched = await asyncio.gather(*tasks)

        for img in fetched:
            if img:
                results.append(img)

        if not results:
            raise RuntimeError("Pollinations provider was unable to generate an image. Check connection.")

        return results
