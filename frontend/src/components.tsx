import { useEffect, useRef, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Clock3,
  FolderKanban,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import type { Project } from "./api";
export function Modal({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={close}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="modal-head">
        <h2>{title}</h2>
        <button className="icon-btn" aria-label="Close dialog" onClick={close}>
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function State({
  loading,
  error,
  empty,
  children,
}: {
  loading: boolean;
  error: Error | null;
  empty?: boolean;
  children: ReactNode;
}) {
  if (loading)
    return (
      <div className="state" role="status">
        <span className="spinner" />
        Loading your workspace…
      </div>
    );
  if (error)
    return (
      <div className="state error" role="alert">
        <h3>We couldn’t load your workspace</h3>
        <p>{error.message}</p>
        <button className="secondary" onClick={() => window.location.reload()}>
          Try again
        </button>
      </div>
    );
  if (empty)
    return (
      <div className="state">
        <FolderKanban size={34} />
        <h3>A fresh start</h3>
        <p>Create your first project to bring your work together.</p>
      </div>
    );
  return children;
}
export function PageHeading({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="muted">{subtitle}</p>
      </div>
      {action}
    </div>
  );
}
export function ProjectCard({
  project: p,
  index,
  edit,
  remove,
}: {
  project: Project;
  index: number;
  edit?: () => void;
  remove?: () => void;
}) {
  const pct = p.total_tasks
    ? Math.round((p.completed_tasks / p.total_tasks) * 100)
    : 0;
  return (
    <article className="project-card">
      <div className="card-top">
        <span className={`project-icon color-${index % 3}`}>
          <FolderKanban size={22} />
        </span>
        {edit && (
          <div className="actions">
            <button
              className="icon-btn"
              aria-label={`Edit ${p.name}`}
              onClick={edit}
            >
              <Pencil size={15} />
            </button>
            <button
              className="icon-btn"
              aria-label={`Delete ${p.name}`}
              onClick={remove}
            >
              <Trash2 size={15} />
            </button>
          </div>
        )}
      </div>
      <Link className="project-title" to={`/projects/${p.id}`}>
        {p.name}
        <ArrowRight size={17} />
      </Link>
      <p className="project-description">
        {p.description || "A fresh space for your next great idea."}
      </p>
      <div className="completion">
        <span>
          {p.completed_tasks} / {p.total_tasks} tasks complete
        </span>
        <strong>{pct}%</strong>
      </div>
      <div className="progress">
        <span style={{ width: `${pct}%` }} />
      </div>
      <div className="card-bottom">
        <span>
          <Clock3 size={13} />
          {p.in_progress_tasks} in progress
        </span>
        <Link to={`/projects/${p.id}`}>Open project →</Link>
      </div>
    </article>
  );
}
