import api from "@/lib/axios";

export interface ChatResponseData {
  response: string;
  conversation_id?: string;
}

export async function sendMessage(
  message: string,
  conversationId?: string,
  filePath?: string
): Promise<ChatResponseData> {
  const response = await api.post("/chat/", {
    message,
    conversation_id: conversationId,
    file_path: filePath,
  });

  return response.data;
}

export async function uploadFile(file: File): Promise<{ filename: string; file_path: string; extension: string }> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await api.post("/files/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
}