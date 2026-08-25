import api from "@/lib/axios";

export async function sendMessage(message: string) {
  const response = await api.post("/chat/", {
    message,
  });

  return response.data;
}