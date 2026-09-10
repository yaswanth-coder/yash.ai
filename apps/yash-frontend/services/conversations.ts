import api from "@/lib/axios";

export interface MessageItem {
  id: string;
  role: "user" | "assistant";
  content: string;
  file_path?: string;
  provider?: string;
  model?: string;
  sources?: Array<{
    title: string;
    url: string;
    domain: string;
    snippet: string;
  }>;
  chart_images?: string[];
  created_at?: string;
}

export interface ConversationItem {
  id: string;
  title: string;
  pinned?: boolean;
  archived?: boolean;
  project_id?: string;
  summary?: string;
  created_at: string;
  updated_at: string;
}

export interface ConversationDetail extends ConversationItem {
  messages: MessageItem[];
}

export async function fetchConversations(archived = false): Promise<ConversationItem[]> {
  try {
    const response = await api.get<ConversationItem[]>("/conversations/", {
      params: { archived },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching conversations:", error);
    return [];
  }
}

export async function searchConversations(query: string): Promise<ConversationItem[]> {
  try {
    const response = await api.get<ConversationItem[]>("/conversations/search", {
      params: { q: query },
    });
    return response.data;
  } catch (error) {
    console.error("Error searching conversations:", error);
    return [];
  }
}

export async function fetchConversationDetail(id: string): Promise<ConversationDetail | null> {
  try {
    const response = await api.get<ConversationDetail>(`/conversations/${id}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching conversation detail:", error);
    return null;
  }
}

export async function updateConversation(
  id: string,
  data: { title?: string; pinned?: boolean; archived?: boolean; project_id?: string }
): Promise<ConversationItem | null> {
  try {
    const response = await api.patch<ConversationItem>(`/conversations/${id}`, data);
    return response.data;
  } catch (error) {
    console.error("Error updating conversation:", error);
    return null;
  }
}

export async function deleteConversation(id: string): Promise<boolean> {
  try {
    await api.delete(`/conversations/${id}`);
    return true;
  } catch (error) {
    console.error("Error deleting conversation:", error);
    return false;
  }
}
