import api from "@/lib/axios";
import { getToken } from "./auth";

export interface ProjectItem {
  id: string;
  name: string;
  description?: string;
  files: string[];
  created_at: string;
  updated_at: string;
}

export async function fetchProjects(): Promise<ProjectItem[]> {
  if (!getToken()) {
    return [];
  }
  try {
    const res = await api.get<ProjectItem[]>("/projects/");
    return res.data;
  } catch (error) {
    console.error("Error fetching projects:", error);
    return [];
  }
}

export async function createProject(name: string, description?: string): Promise<ProjectItem | null> {
  try {
    const res = await api.post<ProjectItem>("/projects/", { name, description });
    return res.data;
  } catch (error) {
    console.error("Error creating project:", error);
    return null;
  }
}

export async function deleteProject(id: string): Promise<boolean> {
  try {
    await api.delete(`/projects/${id}`);
    return true;
  } catch (error) {
    console.error("Error deleting project:", error);
    return false;
  }
}
