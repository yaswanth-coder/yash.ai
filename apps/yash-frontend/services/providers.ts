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
      { id: "ollama:llama3", name: "Ollama (Local Llama 3)", is_local: true, description: "Runs locally on your device" },
      { id: "groq:llama-3.3-70b-versatile", name: "Groq (Llama 3.3 70B)", description: "High-speed inference" },
    ];
  }
}
