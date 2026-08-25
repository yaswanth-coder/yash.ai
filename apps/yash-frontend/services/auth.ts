import api from "@/lib/axios";

export interface User {
  id: string;
  email: string;
  full_name?: string;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export const getToken = (): string | null => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("yash_ai_token");
  }
  return null;
};

export const setToken = (token: string) => {
  if (typeof window !== "undefined") {
    localStorage.setItem("yash_ai_token", token);
  }
};

export const removeToken = () => {
  if (typeof window !== "undefined") {
    localStorage.removeItem("yash_ai_token");
    localStorage.removeItem("yash_ai_user");
  }
};

export async function register(email: string, password: string, fullName?: string): Promise<AuthResponse> {
  const response = await api.post("/auth/register", {
    email,
    password,
    full_name: fullName,
  });
  if (response.data?.access_token) {
    setToken(response.data.access_token);
    if (typeof window !== "undefined") {
      localStorage.setItem("yash_ai_user", JSON.stringify(response.data.user));
    }
  }
  return response.data;
}

export async function login(email: string, password: string): Promise<AuthResponse> {

  const response = await api.post("/auth/login", {
    email,
    password,
  });
  if (response.data?.access_token) {
    setToken(response.data.access_token);
    if (typeof window !== "undefined") {
      localStorage.setItem("yash_ai_user", JSON.stringify(response.data.user));
    }
  }
  return response.data;
}

export async function getMe(): Promise<User | null> {
  try {
    const token = getToken();
    if (!token) return null;
    const response = await api.get("/auth/me");
    return response.data;
  } catch {
    removeToken();
    return null;
  }
}
