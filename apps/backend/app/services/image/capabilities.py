from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any


class ImageCapability(BaseModel):
    """
    Declares the verified capabilities of an AI image generation model/provider.
    Frontend dynamically enables/disables controls based strictly on these flags.
    """
    model_id: str
    name: str
    provider: str
    description: str = ""
    is_available: bool = True
    
    # Core capabilities
    text_to_image: bool = True
    image_to_image: bool = False
    inpainting: bool = False
    outpainting: bool = False
    variations: bool = False
    upscale: bool = False
    
    # Parameter support
    negative_prompt: bool = False
    seed: bool = False
    multiple_images: bool = False
    reference_images: bool = False
    
    # Supported values
    supported_aspect_ratios: List[str] = Field(default_factory=lambda: ["1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3", "21:9"])
    max_resolution: int = 1024
    supported_styles: List[str] = Field(default_factory=lambda: [
        "Photorealistic", "Cinematic", "Anime", "3D Render", "Digital Art",
        "Oil Painting", "Watercolor", "Minimalist", "Fashion Editorial",
        "Product Photography", "Concept Art", "Cyberpunk", "Indian Traditional", "Luxury"
    ])
    supported_export_formats: List[str] = Field(default_factory=lambda: ["PNG", "JPEG", "WebP"])
