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
function errorMessage(detail: unknown): string | null {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const messages = detail
      .filter((issue): issue is { loc?: unknown; msg: string } =>
        !!issue && typeof issue.msg === "string",
      )
      .map((issue) => {
        const field = Array.isArray(issue.loc) ? issue.loc.at(-1) : undefined;
        return typeof field === "string" ? `${field}: ${issue.msg}` : issue.msg;
      });
    return messages.length ? messages.join("; ") : null;
  }
  return null;
}
export async function api<T>(
  path: string,
  method = "GET",
  data?: unknown,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method,
      headers: data ? { "Content-Type": "application/json" } : {},
      body: data ? JSON.stringify(data) : undefined,
    });
  } catch (cause) {
    console.error("TaskFlow request failed", { method, path, cause });
    const reason = cause instanceof Error ? cause.message : String(cause);
    throw new Error(`Could not send ${method} ${path}: ${reason}`);
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(
      errorMessage(body?.detail) ||
        `Request failed (${response.status}). Check your fields and try again.`,
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
