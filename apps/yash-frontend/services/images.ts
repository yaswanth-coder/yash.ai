import api, { getApiBaseUrl } from "@/lib/axios";

export interface ImageCapability {
  model_id: string;
  name: string;
  provider: string;
  description: string;
  is_available: boolean;
  text_to_image: boolean;
  image_to_image: boolean;
  inpainting: boolean;
  outpainting: boolean;
  variations: boolean;
  upscale: boolean;
  negative_prompt: boolean;
  seed: boolean;
  multiple_images: boolean;
  reference_images: boolean;
  supported_aspect_ratios: string[];
  max_resolution: number;
  supported_styles: string[];
  supported_export_formats: string[];
}

export interface GeneratedImageItem {
  asset_id: string;
  url: string;
  width: number;
  height: number;
  provider: string;
  model: string;
  prompt: string;
  created_at: string;
  metadata?: Record<string, any>;
}

export interface PromptDecomposition {
  subject: string;
  environment: string;
  lighting: string;
  composition: string;
  style: string;
  color_palette: string;
}

export interface PromptEnhanceResult {
  enhanced_prompt: string;
  negative_prompt?: string;
  decomposition: PromptDecomposition;
  recommended_aspect_ratio: string;
  recommended_style: string;
}

export interface GenerateImagePayload {
  prompt: string;
  negative_prompt?: string;
  aspect_ratio?: string;
  style?: string;
  seed?: number | null;
  num_images?: number;
  model?: string;
  project_id?: string;
  reference_image?: string; // base64
  reference_strength?: number;
}

export interface EditImagePayload {
  image: string; // base64
  mask?: string;  // base64
  prompt: string;
  negative_prompt?: string;
  action_type?: "inpaint" | "remove" | "replace";
  model?: string;
  project_id?: string;
}

export interface OutpaintPayload {
  image: string; // base64
  direction: "left" | "right" | "top" | "bottom" | "all";
  prompt: string;
  project_id?: string;
}

export interface VariationPayload {
  image: string; // base64
  prompt?: string;
  num_variations?: number;
  project_id?: string;
}

export interface UpscalePayload {
  image: string; // base64
  scale_factor: 2 | 4;
  project_id?: string;
}

export function resolveImageUrl(url: string): string {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
    return url;
  }
  const base = getApiBaseUrl().replace(/\/$/, "");
  const cleanUrl = url.startsWith("/") ? url : `/${url}`;
  return `${base}${cleanUrl}`;
}

export async function fetchAvailableModels(): Promise<ImageCapability[]> {
  try {
    const res = await api.get<ImageCapability[]>("/images/models");
    return res.data;
  } catch (err) {
    console.warn("Failed to fetch image models from server, falling back to offline registry", err);
    // Offline / zero-config fallback
    return [
      {
        model_id: "pollinations:flux",
        name: "Flux.1 Fast",
        provider: "pollinations",
        description: "Zero-latency open weights generator with remarkable prompt adherence.",
        is_available: true,
        text_to_image: true,
        image_to_image: false,
        inpainting: false,
        outpainting: false,
        variations: true,
        upscale: true,
        negative_prompt: true,
        seed: true,
        multiple_images: true,
        reference_images: false,
        supported_aspect_ratios: ["1:1", "16:9", "9:16", "4:3", "3:4", "21:9"],
        max_resolution: 1024,
        supported_styles: ["Photorealistic", "Cinematic", "Anime", "3D Render", "Digital Art", "Cyberpunk", "Luxury"],
        supported_export_formats: ["PNG", "JPEG", "WebP"]
      },
      {
        model_id: "pollinations:flux-realism",
        name: "Flux Realism",
        provider: "pollinations",
        description: "Specialized photorealism checkpoint with natural skin and camera optics.",
        is_available: true,
        text_to_image: true,
        image_to_image: false,
        inpainting: false,
        outpainting: false,
        variations: true,
        upscale: true,
        negative_prompt: true,
        seed: true,
        multiple_images: true,
        reference_images: false,
        supported_aspect_ratios: ["1:1", "16:9", "9:16", "4:3", "3:4"],
        max_resolution: 1024,
        supported_styles: ["Photorealistic", "Cinematic", "Fashion Editorial", "Product Photography"],
        supported_export_formats: ["PNG", "JPEG", "WebP"]
      }
    ];
  }
}

export async function enhancePromptApi(payload: {
  prompt: string;
  style?: string;
  aspect_ratio?: string;
  negative_prompt?: string;
}): Promise<PromptEnhanceResult> {
  try {
    const res = await api.post<PromptEnhanceResult>("/images/enhance-prompt", payload);
    return res.data;
  } catch (err: any) {
    // Fallback to legacy endpoint if 404
    if (err?.response?.status === 404) {
      try {
        const legacyRes = await api.post<{ enhanced_prompt: string }>("/generations/enhance-prompt", {
          prompt: payload.prompt,
          style: payload.style || "Photorealistic"
        });
        return {
          enhanced_prompt: legacyRes.data.enhanced_prompt,
          decomposition: {
            subject: payload.prompt,
            environment: "atmospheric background",
            lighting: "natural lighting",
            composition: "standard framing",
            style: payload.style || "Photorealistic",
            color_palette: "harmonious"
          },
          recommended_aspect_ratio: payload.aspect_ratio || "1:1",
          recommended_style: payload.style || "Photorealistic"
        };
      } catch (legacyErr) {
        console.warn("Legacy prompt enhancement failed, using heuristic expansion", legacyErr);
      }
    }

    // Direct local artistic heuristic expansion
    const styleSuffix = payload.style ? `, ${payload.style} style, ultra high resolution, cinematic composition` : "";
    return {
      enhanced_prompt: `${payload.prompt}${styleSuffix}`,
      decomposition: {
        subject: payload.prompt,
        environment: "atmospheric background",
        lighting: "natural cinematic illumination",
        composition: "well-balanced shot",
        style: payload.style || "Photorealistic",
        color_palette: "rich tonal harmony"
      },
      recommended_aspect_ratio: payload.aspect_ratio || "1:1",
      recommended_style: payload.style || "Photorealistic"
    };
  }
}

export async function generateImagesApi(payload: GenerateImagePayload): Promise<GeneratedImageItem[]> {
  try {
    const res = await api.post<{ images: GeneratedImageItem[]; count: number }>("/images/generate", payload);
    return res.data.images.map((img) => ({
      ...img,
      url: resolveImageUrl(img.url)
    }));
  } catch (err: any) {
    // If /images/generate returned 404 (e.g. talking to older remote backend), try backward-compatible route
    if (err?.response?.status === 404) {
      console.warn("/images/generate returned 404. Attempting fallback to /generations/generate-image-sync...");
      try {
        const fallbackRes = await api.post<any>("/generations/generate-image-sync", {
          prompt: payload.prompt,
          negative_prompt: payload.negative_prompt,
          aspect_ratio: payload.aspect_ratio || "1:1",
          style: payload.style || "Photorealistic",
          seed: payload.seed,
          model: payload.model,
          provider: payload.model?.split(":")[0] || "pollinations",
          project_id: payload.project_id || "default"
        });
        if (fallbackRes.data?.url) {
          return [{
            asset_id: fallbackRes.data.asset_id || `gen_${Date.now()}`,
            url: resolveImageUrl(fallbackRes.data.url),
            width: fallbackRes.data.width || 1024,
            height: fallbackRes.data.height || 1024,
            provider: fallbackRes.data.provider || "pollinations",
            model: fallbackRes.data.model || "flux",
            prompt: payload.prompt,
            created_at: new Date().toISOString()
          }];
        }
      } catch (fallbackErr) {
        console.warn("Legacy fallback failed, proceeding to direct synthesis fallback...", fallbackErr);
      }

      // Direct client-side Pollinations synthesis fallback so user is NEVER blocked by 404
      const width = payload.aspect_ratio === "16:9" ? 1280 : payload.aspect_ratio === "9:16" ? 720 : 1024;
      const height = payload.aspect_ratio === "16:9" ? 720 : payload.aspect_ratio === "9:16" ? 1280 : 1024;
      const encodedPrompt = encodeURIComponent(
        payload.style ? `${payload.prompt}, ${payload.style} style` : payload.prompt
      );
      const usedSeed = payload.seed || Math.floor(Math.random() * 1000000);
      const directUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&model=flux&nologo=true&seed=${usedSeed}`;

      return [{
        asset_id: `fallback_${Date.now()}`,
        url: directUrl,
        width,
        height,
        provider: "pollinations",
        model: "flux",
        prompt: payload.prompt,
        created_at: new Date().toISOString()
      }];
    }
    throw err;
  }
}

export async function editImageApi(payload: EditImagePayload): Promise<GeneratedImageItem> {
  const res = await api.post<GeneratedImageItem>("/images/edit", payload);
  return {
    ...res.data,
    url: resolveImageUrl(res.data.url)
  };
}

export async function outpaintImageApi(payload: OutpaintPayload): Promise<GeneratedImageItem> {
  const res = await api.post<GeneratedImageItem>("/images/outpaint", payload);
  return {
    ...res.data,
    url: resolveImageUrl(res.data.url)
  };
}

export async function createVariationsApi(payload: VariationPayload): Promise<GeneratedImageItem[]> {
  const res = await api.post<{ images: GeneratedImageItem[]; count: number }>("/images/variation", payload);
  return res.data.images.map((img) => ({
    ...img,
    url: resolveImageUrl(img.url)
  }));
}

export async function upscaleImageApi(payload: UpscalePayload): Promise<GeneratedImageItem> {
  const res = await api.post<GeneratedImageItem>("/images/upscale", payload);
  return {
    ...res.data,
    url: resolveImageUrl(res.data.url)
  };
}

export async function fetchImageHistory(projectId?: string, limit: number = 30): Promise<GeneratedImageItem[]> {
  try {
    const params: Record<string, any> = { limit };
    if (projectId) params.project_id = projectId;
    const res = await api.get<{ history: GeneratedImageItem[]; count: number }>("/images/history", { params });
    return res.data.history.map((img) => ({
      ...img,
      url: resolveImageUrl(img.url)
    }));
  } catch (err) {
    console.warn("Failed to fetch image history", err);
    return [];
  }
}

export async function exportFormatBlob(imageBase64: string, format: "PNG" | "JPEG" | "WEBP", quality: number = 95): Promise<Blob> {
  const res = await api.post(
    "/images/export-format",
    { image: imageBase64, format, quality },
    { responseType: "blob" }
  );
  return res.data;
}
