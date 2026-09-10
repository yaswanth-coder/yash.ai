import api from "@/lib/axios";

export interface MemoryItem {
  id: string;
  fact: string;
  category: "preference" | "skill" | "project" | "style" | "custom" | string;
  source: "chat" | "training" | "manual" | string;
  created_at: string;
}

export interface MemorySettings {
  learning_enabled: boolean;
  total_memories: number;
}

export interface TrainHistoryResponse {
  extracted_count: number;
  memories: MemoryItem[];
  message: string;
}

export async function fetchMemories(): Promise<MemoryItem[]> {
  try {
    const response = await api.get<MemoryItem[]>("/memory/");
    return response.data;
  } catch (error) {
    console.error("Error fetching memories:", error);
    return [];
  }
}

export async function addMemory(fact: string, category = "custom"): Promise<MemoryItem | null> {
  try {
    const response = await api.post<MemoryItem>("/memory/", { fact, category });
    return response.data;
  } catch (error) {
    console.error("Error adding memory:", error);
    return null;
  }
}

export async function trainOnHistory(): Promise<TrainHistoryResponse | null> {
  try {
    const response = await api.post<TrainHistoryResponse>("/memory/train");
    return response.data;
  } catch (error) {
    console.error("Error training AI on history:", error);
    return null;
  }
}

export async function deleteMemory(id: string): Promise<boolean> {
  try {
    await api.delete(`/memory/${id}`);
    return true;
  } catch (error) {
    console.error("Error deleting memory:", error);
    return false;
  }
}

export async function clearAllMemories(): Promise<boolean> {
  try {
    await api.delete("/memory/clear/all");
    return true;
  } catch (error) {
    console.error("Error clearing memories:", error);
    return false;
  }
}

export async function getMemorySettings(): Promise<MemorySettings> {
  try {
    const response = await api.get<MemorySettings>("/memory/settings");
    return response.data;
  } catch (error) {
    return { learning_enabled: true, total_memories: 0 };
  }
}

export async function updateMemorySettings(learningEnabled: boolean): Promise<MemorySettings | null> {
  try {
    const response = await api.put<MemorySettings>("/memory/settings", {
      learning_enabled: learningEnabled,
    });
    return response.data;
  } catch (error) {
    console.error("Error updating memory settings:", error);
    return null;
  }
}
