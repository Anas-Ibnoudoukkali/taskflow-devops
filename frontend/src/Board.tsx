import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock3, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { State } from "./components";
import {
  api,
  isOverdue,
  statuses,
  statusLabel,
  type Project,
  type Task,
  type Status,
} from "./api";
export default function Board({
  projectId,
  projects,
  createTask,
  edit,
  remove,
}: {
  projectId?: number;
  projects: Project[];
  createTask: (id?: number, s?: Status) => void;
  edit: (t: Task) => void;
  remove: (t: Task) => void;
}) {
  const [q, setQ] = useState("");
  const [priority, setPriority] = useState("");
  const [status, setStatus] = useState("");
  const [project, setProject] = useState("");
  const filters = new URLSearchParams();
  if (q) filters.set("q", q);
  if (priority) filters.set("priority", priority);
  if (status) filters.set("status", status);
  if (projectId || project)
    filters.set("project_id", String(projectId || project));
  const query = useQuery({
    queryKey: ["tasks", filters.toString()],
    queryFn: () => api<Task[]>(`/api/tasks?${filters}`),
  });
  const client = useQueryClient();
  const changeStatus = async (id: number, s: Status) => {
    try {
      await api(`/api/tasks/${id}`, "PATCH", { status: s });
      await client.invalidateQueries();
      toast.success(`Moved to ${statusLabel[s]}`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  return (
    <>
      <div className="filters">
        <div className="search">
          <Search size={17} />
          <input
            aria-label="Search tasks"
            placeholder="Search tasks…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        {!projectId && (
          <select
            aria-label="Filter by project"
            value={project}
            onChange={(e) => setProject(e.target.value)}
          >
            <option value="">All projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}
        <select
          aria-label="Filter by priority"
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
        >
          <option value="">All priorities</option>
          {["low", "medium", "high"].map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
        <select
          aria-label="Filter by status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All statuses</option>
          {statuses.map((s) => (
            <option key={s} value={s}>
              {statusLabel[s]}
            </option>
          ))}
        </select>
        <span className="muted task-count">
          {query.data?.length || 0} tasks
        </span>
      </div>
      <State loading={query.isPending} error={query.error}>
        <div className="kanban">
          {statuses.map((s) => {
            const tasks = (query.data || []).filter((t) => t.status === s);
            return (
              <section
                key={s}
                className={`kanban-column ${s}`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const id = Number(e.dataTransfer.getData("text/plain"));
                  if (query.data?.some((t) => t.id === id))
                    void changeStatus(id, s);
                }}
              >
                <div className="column-heading">
                  <h2>
                    <span className={`status-dot ${s}`} />
                    {statusLabel[s]}
                    <span className="count">{tasks.length}</span>
                  </h2>
                  <button
                    className="icon-btn"
                    aria-label={`Add ${statusLabel[s]} task`}
                    onClick={() =>
                      createTask(projectId || Number(project) || undefined, s)
                    }
                  >
                    <Plus size={18} />
                  </button>
                </div>
                {tasks.map((t) => (
                  <article
                    key={t.id}
                    className="task-card"
                    draggable
                    onDragStart={(e) =>
                      e.dataTransfer.setData("text/plain", String(t.id))
                    }
                  >
                    <div className="card-top">
                      <span className={`badge ${t.priority}`}>
                        {t.priority}
                      </span>
                      <div className="actions">
                        <button
                          className="icon-btn"
                          aria-label={`Edit ${t.title}`}
                          onClick={() => edit(t)}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          className="icon-btn"
                          aria-label={`Delete ${t.title}`}
                          onClick={() => remove(t)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <button className="task-title" onClick={() => edit(t)}>
                      {t.title}
                    </button>
                    {t.description && <p>{t.description}</p>}
                    <small className="task-project">
                      {projects.find((p) => p.id === t.project_id)?.name}
                    </small>
                    <div className="task-footer">
                      <span className={isOverdue(t) ? "overdue" : ""}>
                        <Clock3 size={13} />
                        {t.due_date
                          ? new Date(
                              `${t.due_date}T00:00:00`,
                            ).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                            })
                          : "No due date"}
                      </span>
                      <select
                        aria-label={`Status of ${t.title}`}
                        value={t.status}
                        onChange={(e) =>
                          void changeStatus(t.id, e.target.value as Status)
                        }
                      >
                        {statuses.map((s) => (
                          <option key={s} value={s}>
                            {statusLabel[s]}
                          </option>
                        ))}
                      </select>
                    </div>
                  </article>
                ))}
                {!tasks.length && (
                  <div className="column-empty">
                    {q || priority || status
                      ? "No matching tasks"
                      : "Room for your next step"}
                  </div>
                )}
                <button
                  className="add-task"
                  onClick={() =>
                    createTask(projectId || Number(project) || undefined, s)
                  }
                >
                  <Plus size={16} />
                  Add task
                </button>
              </section>
            );
          })}
        </div>
      </State>
    </>
  );
}
