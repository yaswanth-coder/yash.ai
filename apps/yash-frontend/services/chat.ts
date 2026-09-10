import api from "@/lib/axios";

export interface ChatResponse {
  response: string;
  conversation_id?: string;
  provider?: string;
  model?: string;
  fallback_used?: boolean;
  original_provider?: string;
  sources?: Array<{
    title: string;
    url: string;
    domain: string;
    snippet: string;
  }>;
  chart_images?: string[];
}

export interface StreamEvent {
  type: "init" | "token" | "meta" | "done" | "error";
  token?: string;
  conversation_id?: string;
  sources?: Array<{
    title: string;
    url: string;
    domain: string;
    snippet: string;
  }>;
  chart_images?: string[];
  provider?: string;
  model?: string;
  fallback_used?: boolean;
  original_provider?: string;
}

export async function sendMessage(
  message: string,
  conversationId?: string,
  filePath?: string,
  model = "auto",
  webSearch = true,
  localOnly = false,
  projectId?: string
): Promise<ChatResponse> {
  const response = await api.post<ChatResponse>("/chat/", {
    message,
    conversation_id: conversationId,
    file_path: filePath,
    model,
    web_search: webSearch,
    local_only: localOnly,
    project_id: projectId,
  });
  return response.data;
}

export async function streamMessage(
  message: string,
  conversationId: string | undefined,
  filePath: string | undefined,
  model: string,
  webSearch: boolean,
  localOnly: boolean,
  onEvent: (event: StreamEvent) => void,
  abortSignal?: AbortSignal,
  projectId?: string
): Promise<void> {
  const token = typeof window !== "undefined" ? localStorage.getItem("yash_ai_token") : null;
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

  const response = await fetch(`${baseUrl}/chat/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      message,
      conversation_id: conversationId,
      file_path: filePath,
      model,
      web_search: webSearch,
      local_only: localOnly,
      project_id: projectId,
    }),
    signal: abortSignal,
  });

  if (!response.ok) {
    if (response.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("yash_ai_token");
      localStorage.removeItem("yash_ai_user");
    }
    const errText = await response.text().catch(() => "");
    throw new Error(`HTTP error ${response.status}: ${errText || response.statusText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) return;

  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n\n");
    buffer = lines.pop() || "";

    for (const block of lines) {
      const line = block.trim();
      if (line.startsWith("data: ")) {
        const rawJson = line.replace("data: ", "").trim();
        try {
          const parsed: StreamEvent = JSON.parse(rawJson);
          onEvent(parsed);
        } catch (e) {
          console.error("Failed to parse SSE line:", rawJson);
        }
      }
    }
  }
}