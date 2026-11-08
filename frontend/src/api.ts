export type Status = "todo" | "in_progress" | "done";
export type Priority = "low" | "medium" | "high";
export interface Project {
  id: number;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
  total_tasks: number;
  completed_tasks: number;
  in_progress_tasks: number;
}
export interface Task {
  id: number;
  project_id: number;
  title: string;
  description: string;
  status: Status;
  priority: Priority;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}
export type ProjectInput = Pick<Project, "name" | "description">;
export type TaskInput = Omit<Task, "id" | "created_at" | "updated_at">;
export interface Dashboard {
  total_projects: number;
  total_tasks: number;
  completed_tasks: number;
  in_progress_tasks: number;
  overdue_tasks: number;
  recent_tasks: Task[];
}
const base = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(
  /\/$/,
  "",
);
export async function api<T>(
  path: string,
  method = "GET",
  data?: unknown,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${base}${path}`, {
      method,
      headers: data ? { "Content-Type": "application/json" } : {},
      body: data ? JSON.stringify(data) : undefined,
    });
  } catch {
    throw new Error(
      "Cannot connect to TaskFlow. Check that the API is running.",
    );
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(
      typeof body?.detail === "string"
        ? body.detail
        : "Unable to save. Check your fields and try again.",
    );
  }
  return response.status === 204 ? (undefined as T) : response.json();
}
export const statusLabel: Record<Status, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  done: "Done",
};
export const statuses: Status[] = ["todo", "in_progress", "done"];
export function isOverdue(task: Task) {
  return (
    !!task.due_date &&
    task.due_date < new Date().toISOString().slice(0, 10) &&
    task.status !== "done"
  );
}
