import axios from "axios";

export function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    const override = localStorage.getItem("yash_ai_api_url");
    if (override) return override;

    // When running locally in browser, target local backend on port 8000
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      return process.env.NEXT_PUBLIC_API_URL && !process.env.NEXT_PUBLIC_API_URL.includes("onrender.com")
        ? process.env.NEXT_PUBLIC_API_URL
        : "http://localhost:8000";
    }
  }
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
}

const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    config.baseURL = getApiBaseUrl();
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("yash_ai_token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// NOTE: We do NOT auto-logout on 401 here.
// Users are only logged out when they explicitly click "Sign Out".
api.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(error)
);

export default api;
