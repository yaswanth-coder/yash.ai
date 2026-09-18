import io
import pytest
from PIL import Image

from app.services.image.capabilities import ImageCapability
from app.services.image.editor import ImageEditorService
from app.services.image.prompt_engine import PromptIntelligenceEngine
from app.services.image.router import ImageProviderRouter
from app.services.image.base import ImageGenerationTask, ImageUpscaleTask


def test_capabilities_aggregation():
    router = ImageProviderRouter()
    caps = router.get_all_capabilities()
    assert len(caps) >= 4
    model_ids = [c.model_id for c in caps]
    assert any("flux" in m for m in model_ids)
    assert any("dall-e-3" in m for m in model_ids)
    assert any("imagen" in m for m in model_ids)
    assert any("stable-diffusion" in m for m in model_ids)


@pytest.mark.asyncio
async def test_prompt_intelligence_heuristic():
    res = await PromptIntelligenceEngine.enhance(
        raw_prompt="A cybernetic white tiger in neo-Tokyo",
        style="Cinematic",
        aspect_ratio="16:9"
    )
    assert res.enhanced_prompt
    assert "cybernetic white tiger" in res.enhanced_prompt.lower()
    assert res.decomposition.subject == "A cybernetic white tiger in neo-Tokyo"
    assert res.recommended_style == "Cinematic"
    assert res.recommended_aspect_ratio == "16:9"
    assert res.negative_prompt is not None


def test_image_editor_outpaint_preparation():
    # Create a 200x200 test image
    img = Image.new("RGBA", (200, 200), (255, 0, 0, 255))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    raw = buf.getvalue()

    canvas_bytes, mask_bytes, new_w, new_h = ImageEditorService.prepare_outpaint_canvas(
        image_bytes=raw,
        direction="right",
        padding_ratio=0.5
    )

    assert new_w == 300  # 200 + 100
    assert new_h == 200

    # Verify mask dimensions
    with Image.open(io.BytesIO(mask_bytes)) as mask_img:
        assert mask_img.size == (300, 200)
        # Check original area is black (0) and new padded area is white (255)
        pixels = mask_img.load()
        assert pixels[50, 50] == 0      # inside original image
        assert pixels[250, 50] == 255   # inside expanded canvas area


def test_image_editor_upscale():
    # Create a 100x100 test image
    img = Image.new("RGB", (100, 100), (0, 128, 255))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    raw = buf.getvalue()

    upscaled_bytes, up_w, up_h = ImageEditorService.upscale_image(raw, scale_factor=2)
    assert up_w == 200
    assert up_h == 200

    with Image.open(io.BytesIO(upscaled_bytes)) as up_img:
        assert up_img.size == (200, 200)


def test_image_editor_format_conversion():
    img = Image.new("RGB", (50, 50), (100, 200, 50))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    raw = buf.getvalue()

    # Test WebP conversion
    webp_bytes, mime_webp = ImageEditorService.convert_format(raw, target_format="WEBP")
    assert mime_webp == "image/webp"
    assert len(webp_bytes) > 0

    # Test JPEG conversion
    jpeg_bytes, mime_jpeg = ImageEditorService.convert_format(raw, target_format="JPEG")
    assert mime_jpeg == "image/jpeg"
    assert len(jpeg_bytes) > 0


def test_provider_resolution_fallback():
    router = ImageProviderRouter()
    # Unconfigured or unknown model should resolve to Pollinations safely
    resolved = router.resolve_provider_for_model("unknown-model-xyz")
    assert resolved.provider_id == "pollinations"
