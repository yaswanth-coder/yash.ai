import api from "@/lib/axios";

export interface ModelItem {
  id: string;
  name: string;
  context_window?: number;
  description?: string;
  is_local?: boolean;
}

export interface ProviderItem {
  name: string;
  is_local: boolean;
  is_configured: boolean;
  status: string;
  latency_ms?: number;
}

export interface ProvidersResponse {
  priority: string[];
  providers: Record<string, ProviderItem>;
}

export async function fetchProviders(): Promise<ProvidersResponse | null> {
  try {
    const res = await api.get<ProvidersResponse>("/ai/providers");
    return res.data;
  } catch (error) {
    console.error("Error fetching AI providers:", error);
    return null;
  }
}

export async function fetchModels(): Promise<ModelItem[]> {
  try {
    const res = await api.get<ModelItem[]>("/ai/providers/models");
    return res.data;
  } catch (error) {
    console.error("Error fetching AI models:", error);
    return [
      { id: "auto", name: "Auto (Best Available)", description: "Automatically routes to the best available provider" },
      { id: "gemini", name: "Google Gemini 3.6", description: "State of the art multimodal model" },
      { id: "nvidia:meta/llama-3.3-70b-instruct", name: "NVIDIA (Llama 3.3 70B)", description: "NVIDIA NIM accelerated inference" },
      { id: "xkiro:default", name: "xKiro AI", description: "High-performance inference via xKiro" },
      { id: "ollama:llama3", name: "Ollama (Local Llama 3)", is_local: true, description: "Runs locally on your device" },
      { id: "groq:llama-3.3-70b-versatile", name: "Groq (Llama 3.3 70B)", description: "High-speed inference" },
    ];
  }
}

export interface CustomModelPayload {
  model_id: string;
  name: string;
  base_url: string;
  api_key: string;
  context_window?: number;
  description?: string;
}

export interface CustomModelItem {
  id: string;
  model_id: string;
  name: string;
  base_url: string;
  api_key: string;
  context_window: number;
  description?: string;
  is_custom?: boolean;
}

export async function fetchCustomModels(): Promise<CustomModelItem[]> {
  try {
    const res = await api.get<CustomModelItem[]>("/ai/providers/custom-models");
    return res.data;
  } catch (error) {
    console.error("Error fetching custom models:", error);
    return [];
  }
}

export async function addCustomModel(payload: CustomModelPayload): Promise<CustomModelItem | null> {
  try {
    const res = await api.post<CustomModelItem>("/ai/providers/custom-models", payload);
    return res.data;
  } catch (error) {
    console.error("Error adding custom model:", error);
    throw error;
  }
}

export async function deleteCustomModel(modelId: string): Promise<boolean> {
  try {
    await api.delete(`/ai/providers/custom-models/${encodeURIComponent(modelId)}`);
    return true;
  } catch (error) {
    console.error("Error deleting custom model:", error);
    return false;
  }
}
