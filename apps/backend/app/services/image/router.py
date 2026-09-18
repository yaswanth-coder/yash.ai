import logging
from typing import List, Dict, Optional

from app.services.image.base import (
    BaseImageProvider, ImageGenerationTask, ImageEditTask,
    ImageVariationTask, ImageUpscaleTask, GeneratedImage
)
from app.services.image.capabilities import ImageCapability
from app.services.image.providers.pollinations import PollinationsImageProvider
from app.services.image.providers.openai_dalle import OpenAIDalleProvider
from app.services.image.providers.gemini_imagen import GeminiImagenProvider
from app.services.image.providers.stability import StabilityAIProvider
from app.services.image.editor import ImageEditorService

logger = logging.getLogger("yash_ai.image.router")


class ImageProviderRouter:
    """
    Central orchestration and routing hub for AI image generation,
    canvas editing, inpainting, outpainting, variations, and upscaling.
    """

    def __init__(self):
        self.providers: Dict[str, BaseImageProvider] = {
            "pollinations": PollinationsImageProvider(),
            "openai": OpenAIDalleProvider(),
            "gemini": GeminiImagenProvider(),
            "stability": StabilityAIProvider(),
        }

    def get_provider(self, provider_id: str) -> Optional[BaseImageProvider]:
        return self.providers.get(provider_id)

    def get_all_capabilities(self) -> List[ImageCapability]:
        """
        Gathers capabilities for all registered providers and models.
        """
        all_caps: List[ImageCapability] = []
        for p in self.providers.values():
            try:
                caps = p.get_capabilities()
                all_caps.extend(caps)
            except Exception as e:
                logger.error(f"Error fetching capabilities from {p.provider_id}: {e}")
        return all_caps

    def resolve_provider_for_model(self, model_id: Optional[str]) -> BaseImageProvider:
        """
        Resolves the appropriate provider for a given model ID.
        Falls back to Pollinations if model is not recognized or provider is unconfigured.
        """
        if not model_id:
            return self.providers["pollinations"]

        model_clean = model_id.lower().strip()

        # DALL-E models
        if "dall-e" in model_clean:
            openai_p = self.providers.get("openai")
            if openai_p and openai_p.is_configured():
                return openai_p

        # Gemini Imagen models
        if "imagen" in model_clean or "gemini" in model_clean:
            gemini_p = self.providers.get("gemini")
            if gemini_p and gemini_p.is_configured():
                return gemini_p

        # Stability models
        if "stable-diffusion" in model_clean or "sdxl" in model_clean or "stability" in model_clean:
            stability_p = self.providers.get("stability")
            if stability_p and stability_p.is_configured():
                return stability_p

        # Check explicit model registry across providers
        for p in self.providers.values():
            for cap in p.get_capabilities():
                if cap.model_id == model_id and p.is_configured():
                    return p

        # Default zero-config fallback
        return self.providers["pollinations"]

    async def generate(self, task: ImageGenerationTask) -> List[GeneratedImage]:
        """
        Generates images with automatic fallback to Pollinations if premium provider encounters an error.
        """
        primary_provider = self.resolve_provider_for_model(task.model)
        try:
            logger.info(f"Generating image with provider '{primary_provider.provider_id}' (model: {task.model})")
            return await primary_provider.generate(task)
        except Exception as e:
            logger.warning(f"Primary provider '{primary_provider.provider_id}' failed: {e}. Falling back to Pollinations.")
            if primary_provider.provider_id != "pollinations":
                fallback_task = task.model_copy(update={"model": "flux"})
                return await self.providers["pollinations"].generate(fallback_task)
            raise

    async def edit(self, task: ImageEditTask) -> GeneratedImage:
        """
        Executes inpainting, object removal, or object replacement.
        Routes to OpenAI DALL-E 2 or Stability AI, depending on available configuration.
        """
        openai_p = self.providers.get("openai")
        stability_p = self.providers.get("stability")

        if openai_p and openai_p.is_configured():
            return await openai_p.edit(task)
        elif stability_p and stability_p.is_configured():
            return await stability_p.edit(task)
        else:
            raise RuntimeError(
                "Inpainting requires an OpenAI API key (for DALL-E 2 edit) or Stability API key (for SDXL Inpaint). "
                "Please configure OPENAI_API_KEY or STABILITY_API_KEY in Settings."
            )

    async def outpaint(
        self,
        image_bytes: bytes,
        prompt: str,
        direction: str = "right"
    ) -> GeneratedImage:
        """
        Expands the canvas in the specified direction and inpaints the newly expanded area.
        """
        canvas_bytes, mask_bytes, new_w, new_h = ImageEditorService.prepare_outpaint_canvas(
            image_bytes=image_bytes,
            direction=direction,
            padding_ratio=0.4
        )

        edit_task = ImageEditTask(
            image_bytes=canvas_bytes,
            mask_bytes=mask_bytes,
            prompt=prompt,
            action_type="outpaint"
        )
        result = await self.edit(edit_task)
        result.metadata["outpaint_direction"] = direction
        return result

    async def variation(self, task: ImageVariationTask) -> List[GeneratedImage]:
        """
        Generates stylistic/compositional variations of an existing image.
        """
        openai_p = self.providers.get("openai")
        if openai_p and openai_p.is_configured():
            return await openai_p.variation(task)

        # Pollinations fallback variation with image prompt
        if task.prompt:
            gen_task = ImageGenerationTask(
                prompt=f"{task.prompt}, variation version, alternative aesthetic composition",
                num_images=task.num_variations or 4
            )
            return await self.providers["pollinations"].generate(gen_task)

        raise RuntimeError("Image variations require OpenAI API key or a guiding prompt.")

    async def upscale(self, task: ImageUpscaleTask) -> GeneratedImage:
        """
        High-grade super-resolution sharpening pipeline using ImageEditorService.
        """
        upscaled_bytes, w, h = ImageEditorService.upscale_image(
            image_bytes=task.image_bytes,
            scale_factor=task.scale_factor
        )

        return GeneratedImage(
            image_bytes=upscaled_bytes,
            mime_type="image/png",
            width=w,
            height=h,
            provider="yash-engine",
            model=f"super-resolution-{task.scale_factor}x",
            metadata={"scale_factor": task.scale_factor}
        )


# Global singleton instance
image_router = ImageProviderRouter()
