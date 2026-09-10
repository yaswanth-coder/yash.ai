import api from "@/lib/axios";
import { getToken } from "@/services/auth";

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
  has_trained?: boolean;
  last_trained_at?: string | null;
}

export interface TrainHistoryResponse {
  extracted_count: number;
  memories: MemoryItem[];
  message: string;
}

export async function fetchMemories(): Promise<MemoryItem[]> {
  const token = getToken();
  if (!token) return [];
  try {
    const response = await api.get<MemoryItem[]>("/memory/");
    return response.data;
  } catch (error) {
    console.error("Error fetching memories:", error);
    return [];
  }
}

export async function addMemory(fact: string, category = "custom"): Promise<MemoryItem | null> {
  const token = getToken();
  if (!token) return null;
  try {
    const response = await api.post<MemoryItem>("/memory/", { fact, category });
    return response.data;
  } catch (error) {
    console.error("Error adding memory:", error);
    return null;
  }
}

export async function trainOnHistory(): Promise<TrainHistoryResponse | null> {
  const token = getToken();
  if (!token) {
    throw new Error("Authentication required: Please sign in to train Yash.AI on your chat history.");
  }
  const response = await api.post<TrainHistoryResponse>("/memory/train");
  return response.data;
}

export async function deleteMemory(id: string): Promise<boolean> {
  const token = getToken();
  if (!token) return false;
  try {
    await api.delete(`/memory/${id}`);
    return true;
  } catch (error) {
    console.error("Error deleting memory:", error);
    return false;
  }
}

export async function clearAllMemories(): Promise<boolean> {
  const token = getToken();
  if (!token) return false;
  try {
    await api.delete("/memory/clear/all");
    return true;
  } catch (error) {
    console.error("Error clearing memories:", error);
    return false;
  }
}

export async function getMemorySettings(): Promise<MemorySettings> {
  const token = getToken();
  if (!token) {
    return { learning_enabled: false, total_memories: 0 };
  }
  try {
    const response = await api.get<MemorySettings>("/memory/settings");
    return response.data;
  } catch (error) {
    return { learning_enabled: true, total_memories: 0 };
  }
}

export async function updateMemorySettings(learningEnabled: boolean): Promise<MemorySettings | null> {
  const token = getToken();
  if (!token) return null;
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
