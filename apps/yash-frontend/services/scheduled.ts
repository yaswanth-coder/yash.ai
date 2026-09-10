import api from "@/lib/axios";

export interface ScheduledTaskItem {
  id: string;
  title: string;
  prompt: string;
  schedule: string;
  enabled: boolean;
  last_run_at?: string;
  created_at: string;
}

export async function fetchScheduledTasks(): Promise<ScheduledTaskItem[]> {
  try {
    const res = await api.get<ScheduledTaskItem[]>("/scheduled/");
    return res.data;
  } catch (error) {
    console.error("Error fetching scheduled tasks:", error);
    return [];
  }
}

export async function createScheduledTask(
  title: string,
  prompt: string,
  schedule = "daily"
): Promise<ScheduledTaskItem | null> {
  try {
    const res = await api.post<ScheduledTaskItem>("/scheduled/", { title, prompt, schedule });
    return res.data;
  } catch (error) {
    console.error("Error creating scheduled task:", error);
    return null;
  }
}

export async function deleteScheduledTask(id: string): Promise<boolean> {
  try {
    await api.delete(`/scheduled/${id}`);
    return true;
  } catch (error) {
    console.error("Error deleting scheduled task:", error);
    return false;
  }
}
