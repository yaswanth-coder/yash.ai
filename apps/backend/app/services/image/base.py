from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from app.services.image.capabilities import ImageCapability


class ImageGenerationTask(BaseModel):
    prompt: str
    negative_prompt: Optional[str] = None
    width: int = 1024
    height: int = 1024
    aspect_ratio: str = "1:1"
    style: Optional[str] = "Photorealistic"
    seed: Optional[int] = None
    num_images: int = 1
    model: Optional[str] = None
    reference_image_bytes: Optional[bytes] = None
    reference_strength: float = 0.5


class ImageEditTask(BaseModel):
    image_bytes: bytes
    mask_bytes: Optional[bytes] = None
    prompt: str
    negative_prompt: Optional[str] = None
    action_type: str = "inpaint"  # inpaint, remove, replace
    model: Optional[str] = None


class ImageVariationTask(BaseModel):
    image_bytes: bytes
    prompt: Optional[str] = None
    variation_strength: float = 0.6
    num_variations: int = 4
    model: Optional[str] = None


class ImageUpscaleTask(BaseModel):
    image_bytes: bytes
    scale_factor: int = 2  # 2 or 4
    model: Optional[str] = None


class GeneratedImage(BaseModel):
    image_bytes: bytes
    mime_type: str = "image/png"
    width: int
    height: int
    seed: Optional[int] = None
    provider: str
    model: str
    metadata: Dict[str, Any] = Field(default_factory=dict)


class BaseImageProvider(ABC):
    """
    Abstract contract for all AI image generation adapters.
    """
    provider_id: str
    name: str

    @abstractmethod
    def get_capabilities(self) -> List[ImageCapability]:
        """Return all models and capabilities supported by this provider."""
        pass

    @abstractmethod
    def is_configured(self) -> bool:
        """Check if necessary credentials / dependencies are available."""
        pass

    @abstractmethod
    async def generate(self, task: ImageGenerationTask) -> List[GeneratedImage]:
        """Synthesize one or more images from prompt parameters."""
        pass

    async def edit(self, task: ImageEditTask) -> GeneratedImage:
        """Inpaint, remove, or replace objects in an image."""
        raise NotImplementedError(f"Provider '{self.provider_id}' does not support inpainting / edit.")

    async def variation(self, task: ImageVariationTask) -> List[GeneratedImage]:
        """Generate stylistic/compositional variations of an existing image."""
        raise NotImplementedError(f"Provider '{self.provider_id}' does not support variations.")

    async def upscale(self, task: ImageUpscaleTask) -> GeneratedImage:
        """Super-resolution upscale of an image."""
        raise NotImplementedError(f"Provider '{self.provider_id}' does not support upscaling.")
