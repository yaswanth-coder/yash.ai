import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://yash-ai-np70.onrender.com";
const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
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
// Individual pages handle 401 gracefully without wiping stored credentials.
api.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(error)
);

export default api;
