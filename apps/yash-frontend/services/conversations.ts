import api from "@/lib/axios";

export interface MessageItem {
  id: string;
  role: "user" | "assistant";
  content: string;
  file_path?: string;
  created_at: string;
}

export interface ConversationItem {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ConversationDetail extends ConversationItem {
  messages: MessageItem[];
}

export async function fetchConversations(): Promise<ConversationItem[]> {
  try {
    const response = await api.get("/conversations/");
    return response.data;
  } catch (error) {
    console.error("Error fetching conversations:", error);
    return [];
  }
}

export async function createConversation(title?: string): Promise<ConversationItem> {
  const response = await api.post("/conversations/", null, {
    params: { title },
  });
  return response.data;
}

export async function fetchConversationDetail(id: string): Promise<ConversationDetail | null> {
  try {
    const response = await api.get(`/conversations/${id}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching conversation details:", error);
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
