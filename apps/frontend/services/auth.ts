import api from "@/lib/axios";

export const login = async (
  email: string,
  password: string
) => {
  const response = await api.post("/auth/login", {
    email,
    password,
  });

  return response.data;
};

export const register = async (
  full_name: string,
  email: string,
  password: string
) => {
  const response = await api.post("/auth/register", {
    full_name,
    email,
    password,
  });

  return response.data;
};