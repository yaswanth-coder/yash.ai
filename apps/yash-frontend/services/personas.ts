import api from "@/lib/axios";

export interface PersonaItem {
  id: string;
  name: string;
  description: string;
  system_prompt: string;
  avatar_icon: string;
  is_preset: boolean;
  starter_prompts: string[];
  tools_enabled: string[];
}

export async function fetchPersonas(): Promise<PersonaItem[]> {
  try {
    const res = await api.get<PersonaItem[]>("/personas/");
    return res.data;
  } catch {
    return [];
  }
}

export async function createPersona(
  name: string,
  description: string,
  system_prompt: string,
  avatar_icon: string = "Bot",
  starter_prompts: string[] = [],
  tools_enabled: string[] = ["web_search", "calculator", "python_sandbox"]
): Promise<PersonaItem | null> {
  try {
    const res = await api.post<PersonaItem>("/personas/", {
      name,
      description,
      system_prompt,
      avatar_icon,
      starter_prompts,
      tools_enabled,
    });
    return res.data;
  } catch {
    return null;
  }
}

export async function deletePersona(id: string): Promise<boolean> {
  try {
    await api.delete(`/personas/${id}`);
    return true;
  } catch {
    return false;
  }
}
