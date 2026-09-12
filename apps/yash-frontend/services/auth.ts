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

/** Read token from localStorage (persists across browser restarts). */
export const getToken = (): string | null => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("yash_ai_token");
  }
  return null;
};

/** Persist token — stored in localStorage so it survives tab/browser closes. */
export const setToken = (token: string, user?: User) => {
  if (typeof window !== "undefined") {
    localStorage.setItem("yash_ai_token", token);
    if (user) {
      localStorage.setItem("yash_ai_user", JSON.stringify(user));
    }
  }
};

/**
 * Remove token — ONLY called on explicit user sign-out.
 * Never called automatically on network errors or 401s.
 */
export const removeToken = () => {
  if (typeof window !== "undefined") {
    localStorage.removeItem("yash_ai_token");
    localStorage.removeItem("yash_ai_user");
  }
};

/** Get the cached user object stored at login (no network call). */
export const getCachedUser = (): User | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("yash_ai_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

/** Check if a valid token exists in storage. */
export const isAuthenticated = (): boolean => {
  return !!getToken();
};

export async function register(
  email: string,
  password: string,
  fullName?: string
): Promise<AuthResponse> {
  const response = await api.post("/auth/register", {
    email,
    password,
    full_name: fullName,
  });
  if (response.data?.access_token) {
    setToken(response.data.access_token, response.data.user);
  }
  return response.data;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const response = await api.post("/auth/login", { email, password });
  if (response.data?.access_token) {
    setToken(response.data.access_token, response.data.user);
  }
  return response.data;
}

/**
 * Fetch current user from backend.
 * Returns null on any error but does NOT remove the token —
 * a network hiccup should not log the user out.
 */
export async function getMe(): Promise<User | null> {
  try {
    const token = getToken();
    if (!token) return null;
    const response = await api.get("/auth/me");
    // Refresh cached user data
    if (typeof window !== "undefined" && response.data) {
      localStorage.setItem("yash_ai_user", JSON.stringify(response.data));
    }
    return response.data;
  } catch {
    // Return cached user instead of logging out on error
    return getCachedUser();
  }
}
