import json
import logging
import re
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field

logger = logging.getLogger("yash_ai.image.prompt_engine")

STYLE_PRESETS = {
    "Photorealistic": {
        "lighting": "natural directional sunlight with soft ambient bounce fill",
        "camera": "shot on 85mm full-frame lens, f/1.8 aperture, crisp focal plane, subtle depth of field",
        "details": "micro-texture fidelity, natural skin and fabric textures, lifelike specular highlights",
        "negative": "blurry, low resolution, deformed, plastic look, oversaturated, disfigured limbs, bad anatomy"
    },
    "Cinematic": {
        "lighting": "dramatic chiaroscuro lighting, anamorphic volumetric haze, teal and warm amber rim illumination",
        "camera": "Panavision anamorphic 35mm, cinematic wide aspect ratio, subtle cinematic film grain, shallow focus",
        "details": "atmospheric perspective, cinematic color grading, high dynamic range tones",
        "negative": "flat lighting, amateur photo, low quality, washed out, low contrast, cartoonish"
    },
    "Anime": {
        "lighting": "vibrant cel-shaded sunlight, glowing edge highlights, soft anime bloom",
        "camera": "dynamic anime key-visual composition, sharp stylized linework",
        "details": "Makoto Shinkai aesthetic, luminous sky, detailed background scenery, expressive rendering",
        "negative": "western comic style, 3d render, photo, photorealistic, dull colors, distorted faces"
    },
    "3D Render": {
        "lighting": "studio multi-point lighting, ray-traced ambient occlusion, subsurface scattering",
        "camera": "isometric perspective or clean 50mm studio angle, sharp geometry",
        "details": "Octane Render 3D aesthetic, physical material shaders, smooth matte and metallic reflections",
        "negative": "2d drawing, sketch, pixelated, grainy, low polygon, low resolution"
    },
    "Digital Art": {
        "lighting": "expressive ambient mood lighting, saturated rim lights",
        "camera": "concept art perspective, painterly depth",
        "details": "intricate digital brushwork, layered atmosphere, vivid fantasy color harmony",
        "negative": "noisy photograph, amateur sketch, pixelated, watermark, text, signature"
    },
    "Indian Traditional": {
        "lighting": "warm festive golden hour glow, earthen diya luminescence, warm ambient hues",
        "camera": "rich architectural perspective, regal framing",
        "details": "intricate zardozi embroidery, silk textiles, traditional Indian motifs, temple carvings, authentic cultural elegance",
        "negative": "westernized, cartoonish, low resolution, distorted patterns, muddy colors"
    },
    "Luxury": {
        "lighting": "minimalist architectural softbox lighting, pristine clean shadows",
        "camera": "editorial luxury publication framing, Hasselblad medium format crispness",
        "details": "polished marble, brushed brass, velvet textures, bespoke high-end craftsmanship",
        "negative": "cheap, cluttered, noisy, garish colors, amateur snapshot"
    },
    "Cyberpunk": {
        "lighting": "neon magenta and cyan sign reflections on wet asphalt, moody night shadows",
        "camera": "low-angle street level perspective, anamorphic lens flare",
        "details": "futuristic holographic glyphs, cybernetic interfaces, rain mist and urban density",
        "negative": "daylight, rustic, pastoral, low contrast, washed out colors"
    }
}


class PromptDecomposition(BaseModel):
    subject: str = Field(description="The core entity, subject, or character of the image")
    environment: str = Field(default="", description="The surrounding environment, setting, or background")
    lighting: str = Field(default="", description="The lighting mood, direction, and source")
    composition: str = Field(default="", description="Camera angle, shot type, lens framing, and depth")
    style: str = Field(default="", description="Art style, medium, and rendering treatment")
    color_palette: str = Field(default="", description="Color scheme and tonal atmosphere")


class PromptEnhanceResult(BaseModel):
    enhanced_prompt: str
    negative_prompt: Optional[str] = None
    decomposition: PromptDecomposition
    recommended_aspect_ratio: str = "1:1"
    recommended_style: str = "Photorealistic"


class PromptIntelligenceEngine:
    """
    Decomposes, optimizes, and semantically enhances generation prompts.
    Uses AI Provider Router for context-aware expansion when available,
    with an intelligent artistic preset engine as instantaneous fallback.
    """

    @classmethod
    async def enhance(
        cls,
        raw_prompt: str,
        style: Optional[str] = "Photorealistic",
        aspect_ratio: Optional[str] = "1:1",
        negative_prompt: Optional[str] = None
    ) -> PromptEnhanceResult:
        """
        Enhance a prompt with structured cinematic/compositional detail
        while strictly preserving the user's intent.
        """
        clean_raw = raw_prompt.strip()
        if not clean_raw:
            clean_raw = "A futuristic crystal sphere floating in a serene sanctuary"

        selected_style = style if (style and style in STYLE_PRESETS) else "Photorealistic"
        preset = STYLE_PRESETS.get(selected_style, STYLE_PRESETS["Photorealistic"])

        # Attempt intelligent LLM expansion first if available
        llm_enhanced = await cls._try_llm_enhancement(clean_raw, selected_style, aspect_ratio)
        if llm_enhanced:
            if negative_prompt:
                llm_enhanced.negative_prompt = f"{llm_enhanced.negative_prompt}, {negative_prompt}".strip(", ")
            return llm_enhanced

        # Fallback to deterministic artistic synthesis
        decomposition = cls._heuristic_decompose(clean_raw, selected_style)

        # Build clean enhanced prompt without spamming tags
        parts = [decomposition.subject]
        if decomposition.environment:
            parts.append(f"set in {decomposition.environment}")
        if decomposition.lighting:
            parts.append(f"illuminated by {decomposition.lighting}")
        if decomposition.composition:
            parts.append(decomposition.composition)
        if decomposition.style:
            parts.append(f"rendered in {decomposition.style}")
        if preset.get("details"):
            parts.append(preset["details"])

        enhanced_text = ", ".join(p for p in parts if p)

        neg = preset.get("negative")
        if negative_prompt:
            neg = f"{neg}, {negative_prompt}" if neg else negative_prompt

        return PromptEnhanceResult(
            enhanced_prompt=enhanced_text,
            negative_prompt=neg,
            decomposition=decomposition,
            recommended_aspect_ratio=aspect_ratio or "1:1",
            recommended_style=selected_style
        )

    @classmethod
    def _heuristic_decompose(cls, raw: str, style: str) -> PromptDecomposition:
        preset = STYLE_PRESETS.get(style, STYLE_PRESETS["Photorealistic"])
        return PromptDecomposition(
            subject=raw,
            environment="an immersive, atmospheric background tailored to the subject",
            lighting=preset.get("lighting", "natural ambient lighting"),
            composition=preset.get("camera", "eye-level shot, well-balanced composition"),
            style=f"{style} aesthetic",
            color_palette="harmonious color grading with natural tones"
        )

    @classmethod
    async def _try_llm_enhancement(
        cls,
        raw_prompt: str,
        style: str,
        aspect_ratio: Optional[str]
    ) -> Optional[PromptEnhanceResult]:
        try:
            from app.services.providers.router import ProviderRouter
            router = ProviderRouter()

            system_instruction = (
                "You are an expert generative AI prompt engineer and artistic director for models like Flux, DALL-E 3, and SDXL.\n"
                "Deconstruct and expand the user's prompt into a vivid, descriptive prompt that yields a masterwork.\n"
                "CRITICAL RULES:\n"
                "1. NEVER alter or replace the user's core subject.\n"
                "2. Do NOT use buzzwords like 'hyperrealistic, 8k, masterpiece, trending on artstation'.\n"
                "3. Provide realistic physical descriptors: lens type, lighting angles, textures, color temperature.\n"
                "4. You MUST respond with ONLY a valid JSON object with these keys:\n"
                "   {\n"
                "     \"subject\": \"...\",\n"
                "     \"environment\": \"...\",\n"
                "     \"lighting\": \"...\",\n"
                "     \"composition\": \"...\",\n"
                "     \"style\": \"...\",\n"
                "     \"color_palette\": \"...\",\n"
                "     \"enhanced_prompt\": \"...\",\n"
                "     \"negative_prompt\": \"...\"\n"
                "   }"
            )

            user_msg = f"Enhance this prompt in {style} style (Aspect ratio {aspect_ratio or '1:1'}): \"{raw_prompt}\""

            import asyncio
            res = await asyncio.wait_for(
                router.generate_response(
                    message=user_msg,
                    system_prompt=system_instruction
                ),
                timeout=4.0
            )

            text_resp = res.get("response", "")
            # Extract JSON block
            json_match = re.search(r"\{[\s\S]*\}", text_resp)
            if not json_match:
                return None

            data = json.loads(json_match.group(0))

            decomp = PromptDecomposition(
                subject=data.get("subject", raw_prompt),
                environment=data.get("environment", ""),
                lighting=data.get("lighting", ""),
                composition=data.get("composition", ""),
                style=data.get("style", style),
                color_palette=data.get("color_palette", "")
            )

            return PromptEnhanceResult(
                enhanced_prompt=data.get("enhanced_prompt") or raw_prompt,
                negative_prompt=data.get("negative_prompt"),
                decomposition=decomp,
                recommended_aspect_ratio=aspect_ratio or "1:1",
                recommended_style=style
            )

        except Exception as e:
            logger.debug(f"LLM prompt enhancement bypassed: {e}")
            return None
