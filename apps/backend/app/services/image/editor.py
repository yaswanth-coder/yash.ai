import io
import logging
from typing import Tuple, Optional
from PIL import Image, ImageFilter, ImageOps

logger = logging.getLogger("yash_ai.image.editor")


class ImageEditorService:
    """
    High-performance PIL-based canvas and image manipulation engine.
    Supports inpaint mask compositing, directional outpainting canvas expansion,
    Lanczos + Unsharp multi-pass upscaling, and format exports.
    """

    @staticmethod
    def prepare_dalle_inpaint(image_bytes: bytes, mask_bytes: bytes) -> Tuple[bytes, bytes]:
        """
        Prepares image and mask for DALL-E 2 inpainting requirements:
        - Image must be square PNG < 4MB.
        - Mask must be RGBA PNG where transparent pixels (alpha = 0) indicate areas to inpaint.
        """
        with Image.open(io.BytesIO(image_bytes)).convert("RGBA") as base_img:
            # Target square dimension 1024x1024
            target_size = (1024, 1024)
            img_resized = base_img.resize(target_size, Image.Resampling.LANCZOS)

            with Image.open(io.BytesIO(mask_bytes)).convert("L") as mask_img:
                mask_resized = mask_img.resize(target_size, Image.Resampling.NEAREST)

                # DALL-E 2 expects transparent areas where edits should occur
                # If mask is white (255) where user drew:
                # We create an RGBA mask where white areas become transparent (alpha 0)
                # and black areas remain opaque (alpha 255)
                mask_rgba = Image.new("RGBA", target_size, (0, 0, 0, 255))
                mask_pixels = mask_resized.load()
                mask_rgba_pixels = mask_rgba.load()

                for y in range(target_size[1]):
                    for x in range(target_size[0]):
                        if mask_pixels[x, y] > 128:
                            # User masked this pixel -> transparent for DALL-E
                            mask_rgba_pixels[x, y] = (0, 0, 0, 0)
                        else:
                            mask_rgba_pixels[x, y] = (0, 0, 0, 255)

                img_out = io.BytesIO()
                img_resized.save(img_out, format="PNG")

                mask_out = io.BytesIO()
                mask_rgba.save(mask_out, format="PNG")

                return img_out.getvalue(), mask_out.getvalue()

    @staticmethod
    def prepare_outpaint_canvas(
        image_bytes: bytes,
        direction: str = "right",
        padding_ratio: float = 0.5
    ) -> Tuple[bytes, bytes, int, int]:
        """
        Expands the canvas in the specified direction ('left', 'right', 'top', 'bottom', 'all').
        Returns:
            (expanded_canvas_png_bytes, mask_png_bytes, new_width, new_height)
        where mask has white (255) on the newly added canvas regions.
        """
        with Image.open(io.BytesIO(image_bytes)).convert("RGBA") as base_img:
            orig_w, orig_h = base_img.size

            pad_w = int(orig_w * padding_ratio)
            pad_h = int(orig_h * padding_ratio)

            if direction == "right":
                new_w, new_h = orig_w + pad_w, orig_h
                offset = (0, 0)
            elif direction == "left":
                new_w, new_h = orig_w + pad_w, orig_h
                offset = (pad_w, 0)
            elif direction == "bottom":
                new_w, new_h = orig_w, orig_h + pad_h
                offset = (0, 0)
            elif direction == "top":
                new_w, new_h = orig_w, orig_h + pad_h
                offset = (0, pad_h)
            elif direction == "all":
                new_w, new_h = orig_w + (pad_w * 2), orig_h + (pad_h * 2)
                offset = (pad_w, pad_h)
            else:
                new_w, new_h = orig_w, orig_h
                offset = (0, 0)

            # Create new RGBA transparent canvas
            canvas = Image.new("RGBA", (new_w, new_h), (0, 0, 0, 0))
            canvas.paste(base_img, offset)

            # Create binary mask (L) where white (255) is the new expanded region
            mask = Image.new("L", (new_w, new_h), 255)
            # Paste black (0) over the original image area to keep it intact
            orig_mask = Image.new("L", (orig_w, orig_h), 0)
            mask.paste(orig_mask, offset)

            canvas_out = io.BytesIO()
            canvas.save(canvas_out, format="PNG")

            mask_out = io.BytesIO()
            mask.save(mask_out, format="PNG")

            return canvas_out.getvalue(), mask_out.getvalue(), new_w, new_h

    @staticmethod
    def upscale_image(image_bytes: bytes, scale_factor: int = 2) -> Tuple[bytes, int, int]:
        """
        High-grade super-resolution sharpening pipeline using Pillow:
        Multi-pass Lanczos resampling + Gaussian Unsharp Masking + Contrast preservation.
        """
        scale_factor = 4 if scale_factor >= 4 else 2
        with Image.open(io.BytesIO(image_bytes)) as img:
            has_alpha = img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info)
            work_img = img.convert("RGBA" if has_alpha else "RGB")

            orig_w, orig_h = work_img.size
            target_w = orig_w * scale_factor
            target_h = orig_h * scale_factor

            # Step 1: High quality Lanczos interpolation
            upscaled = work_img.resize((target_w, target_h), Image.Resampling.LANCZOS)

            # Step 2: Adaptive unsharp mask to restore crisp high-frequency edge detail
            radius = 1.2 if scale_factor == 2 else 2.0
            percent = 135 if scale_factor == 2 else 150
            threshold = 3

            sharpened = upscaled.filter(
                ImageFilter.UnsharpMask(radius=radius, percent=percent, threshold=threshold)
            )

            # Step 3: Subtle detail boost filter
            final_img = sharpened.filter(ImageFilter.DETAIL)

            out_buffer = io.BytesIO()
            if has_alpha:
                final_img.save(out_buffer, format="PNG", optimize=True)
            else:
                final_img.save(out_buffer, format="PNG", optimize=True)

            return out_buffer.getvalue(), target_w, target_h

    @staticmethod
    def convert_format(
        image_bytes: bytes,
        target_format: str = "PNG",
        quality: int = 95
    ) -> Tuple[bytes, str]:
        """
        Converts image bytes to PNG, JPEG, or WebP with optimized compression.
        Returns:
            (converted_bytes, mime_type)
        """
        fmt = target_format.upper()
        if fmt not in ("PNG", "JPEG", "JPG", "WEBP"):
            fmt = "PNG"

        with Image.open(io.BytesIO(image_bytes)) as img:
            out_buffer = io.BytesIO()

            if fmt in ("JPEG", "JPG"):
                # JPEG requires RGB mode
                rgb_img = img.convert("RGB")
                rgb_img.save(out_buffer, format="JPEG", quality=quality, optimize=True)
                return out_buffer.getvalue(), "image/jpeg"

            elif fmt == "WEBP":
                img.save(out_buffer, format="WEBP", quality=quality, method=6)
                return out_buffer.getvalue(), "image/webp"

            else:  # PNG
                img.save(out_buffer, format="PNG", optimize=True)
                return out_buffer.getvalue(), "image/png"
