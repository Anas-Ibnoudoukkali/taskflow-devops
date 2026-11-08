import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowRight,
  Check,
  CheckCheck,
  Circle,
  Clock3,
  FolderKanban,
  LayoutGrid,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import {
  api,
  statusLabel,
  type Dashboard,
  type Project,
  type Task,
  type Status,
} from "./api";
import { PageHeading, State, ProjectCard } from "./components";
import Board from "./Board";
export function Overview({
  projects,
  createTask,
  editTask,
}: {
  projects: Project[];
  createTask: () => void;
  editTask: (t: Task) => void;
}) {
  const query = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api<Dashboard>("/api/dashboard"),
  });
  const d = query.data;
  return (
    <>
      <PageHeading
        eyebrow="YOUR WORK, IN FLOW"
        title="A little clarity. A lot of progress."
        subtitle="Welcome back. Here’s what’s happening across your workspace."
        action={
          <button className="primary" onClick={createTask}>
            <Plus size={18} />
            New task
          </button>
        }
      />
      <State loading={query.isPending} error={query.error}>
        {d && (
          <>
            <div className="stats-grid">
              {[
                [FolderKanban, "Projects", d.total_projects],
                [LayoutGrid, "Total tasks", d.total_tasks],
                [CheckCheck, "Completed", d.completed_tasks],
                [Clock3, "In progress", d.in_progress_tasks],
                [ArrowDown, "Overdue", d.overdue_tasks],
              ].map(([Icon, label, count]) => {
                const I = Icon as typeof FolderKanban;
                return (
                  <div className="stat" key={String(label)}>
                    <div className="stat-top">
                      <span>{String(label)}</span>
                      <I size={18} />
                    </div>
                    <strong>{String(count)}</strong>
                    <small>
                      {label === "Completed"
                        ? "Nice work. Keep it going."
                        : label === "Overdue"
                          ? "Open tasks past their due date"
                          : "Across your workspace"}
                    </small>
                  </div>
                );
              })}
            </div>
            <div className="overview-grid">
              <section className="panel">
                <div className="section-heading">
                  <h2>
                    Recent tasks{" "}
                    <span className="count">{d.recent_tasks.length}</span>
                  </h2>
                  <Link to="/tasks">
                    View board <ArrowRight size={15} />
                  </Link>
                </div>
                {d.recent_tasks.length ? (
                  <div>
                    {d.recent_tasks.map((t) => (
                      <button
                        className="recent-row"
                        key={t.id}
                        onClick={() => editTask(t)}
                      >
                        <span className={`task-circle ${t.status}`}>
                          {t.status === "done" ? (
                            <Check size={14} />
                          ) : (
                            <Circle size={17} />
                          )}
                        </span>
                        <div>
                          <strong>{t.title}</strong>
                          <small>
                            {projects.find((p) => p.id === t.project_id)
                              ?.name || "Project"}
                          </small>
                        </div>
                        <span className={`badge ${t.priority}`}>
                          {t.priority}
                        </span>
                        <span className="recent-status">
                          {statusLabel[t.status]}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="state">
                    <CheckCheck size={34} />
                    <h3>A clear board, a fresh beginning</h3>
                    <p>Add your first task and get into flow.</p>
                    <button className="secondary" onClick={createTask}>
                      Create a task
                    </button>
                  </div>
                )}
              </section>
              <section className="focus-panel">
                <span className="focus-icon">✳</span>
                <p className="eyebrow">ONE STEP AT A TIME</p>
                <h2>
                  Make room for
                  <br />
                  your best work.
                </h2>
                <p>
                  A clear plan turns a busy day into a productive one. Start
                  with one small task.
                </p>
                <div className="completion">
                  <span>Workspace completion</span>
                  <strong>
                    {d.total_tasks
                      ? Math.round((d.completed_tasks / d.total_tasks) * 100)
                      : 0}
                    %
                  </strong>
                </div>
                <div className="progress">
                  <span
                    style={{
                      width: `${d.total_tasks ? (d.completed_tasks / d.total_tasks) * 100 : 0}%`,
                    }}
                  />
                </div>
                <small>
                  {d.completed_tasks} of {d.total_tasks} tasks completed
                </small>
              </section>
            </div>
            <div className="section-heading project-section">
              <h2>Projects at a glance</h2>
              <Link to="/projects">
                All projects <ArrowRight size={15} />
              </Link>
            </div>
            {projects.length ? (
              <div className="project-grid">
                {projects.slice(0, 3).map((p, i) => (
                  <ProjectCard key={p.id} project={p} index={i} />
                ))}
              </div>
            ) : (
              <div className="empty-inline">
                Your next big idea belongs here.{" "}
                <Link to="/projects">Create a project →</Link>
              </div>
            )}
          </>
        )}
      </State>
    </>
  );
}
export function ProjectPage({
  projects,
  projectError,
  createTask,
  editProject,
  removeProject,
  editTask,
  removeTask,
}: {
  projects: Project[];
  projectError: Error | null;
  createTask: (id?: number, s?: Status) => void;
  editProject: (p: Project) => void;
  removeProject: (p: Project) => void;
  editTask: (t: Task) => void;
  removeTask: (t: Task) => void;
}) {
  const { id } = useParams();
  const query = useQuery({
    queryKey: ["project", id],
    queryFn: () => api<Project>(`/api/projects/${id}`),
  });
  const p = query.data;
  return (
    <State loading={query.isPending} error={query.error || projectError}>
      {p && (
        <>
          <Link className="back-link" to="/projects">
            ← All projects
          </Link>
          <PageHeading
            eyebrow="PROJECT WORKSPACE"
            title={p.name}
            subtitle={p.description || "Keep your team of one moving forward."}
            action={
              <div className="actions">
                <button className="secondary" onClick={() => editProject(p)}>
                  <Pencil size={15} />
                  Edit
                </button>
                <button className="secondary" onClick={() => removeProject(p)}>
                  <Trash2 size={15} />
                  Delete
                </button>
                <button className="primary" onClick={() => createTask(p.id)}>
                  <Plus size={18} />
                  New task
                </button>
              </div>
            }
          />
          <div className="project-summary">
            <span>
              <strong>{p.total_tasks}</strong> total tasks
            </span>
            <span>
              <strong>{p.in_progress_tasks}</strong> in progress
            </span>
            <span>
              <strong>{p.completed_tasks}</strong> completed
            </span>
          </div>
          <Board
            projectId={p.id}
            projects={projects}
            createTask={createTask}
            edit={editTask}
            remove={removeTask}
          />
        </>
      )}
    </State>
  );
}
