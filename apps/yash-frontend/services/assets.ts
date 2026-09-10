import api from "@/lib/axios";

export interface AssetItem {
  id: string;
  user_id: string;
  project_id: string;
  type: "IMAGE" | "VIDEO" | "AUDIO" | "MODEL_3D" | "DOCUMENT" | "CODE" | "CANVAS" | "OTHER";
  name: string;
  storage_key: string;
  url: string;
  thumbnail_url?: string;
  size_bytes: number;
  mime_type: string;
  provider: string;
  model: string;
  prompt?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export async function fetchProjectAssets(projectId: string, assetType?: string): Promise<AssetItem[]> {
  try {
    const params: Record<string, string> = {};
    if (assetType && assetType !== "ALL") {
      params.asset_type = assetType;
    }
    const res = await api.get(`/assets/project/${projectId}`, { params });
    return res.data;
  } catch (error) {
    console.error("Failed to fetch project assets:", error);
    return [];
  }
}

export async function uploadAsset(
  projectId: string,
  name: string,
  assetType: string,
  file: File,
  prompt?: string
): Promise<AssetItem | null> {
  try {
    const formData = new FormData();
    formData.append("project_id", projectId);
    formData.append("name", name);
    formData.append("asset_type", assetType);
    if (prompt) formData.append("prompt", prompt);
    formData.append("file", file);

    const res = await api.post("/assets/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  } catch (error) {
    console.error("Failed to upload asset:", error);
    return null;
  }
}

export async function deleteAsset(assetId: string): Promise<boolean> {
  try {
    await api.delete(`/assets/${assetId}`);
    return true;
  } catch (error) {
    console.error("Failed to delete asset:", error);
    return false;
  }
}

export async function getAsset(assetId: string): Promise<AssetItem | null> {
  try {
    const res = await api.get(`/assets/${assetId}`);
    return res.data;
  } catch (error) {
    console.error("Failed to get asset:", error);
    return null;
  }
}
