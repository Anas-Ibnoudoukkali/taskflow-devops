import { useState, type FormEvent } from "react";
import { Modal } from "./components";
import { useWrite } from "./mutations";
import {
  statuses,
  statusLabel,
  type Project,
  type ProjectInput,
  type Task,
  type TaskInput,
  type Status,
  type Priority,
} from "./api";
export type Editor =
  | { kind: "project"; value?: Project }
  | { kind: "task"; value?: Task; projectId?: number; status?: Status };
export function EditorForm({
  editor,
  close,
  projects,
}: {
  editor: Editor;
  close: () => void;
  projects: Project[];
}) {
  const mutation = useWrite<ProjectInput | TaskInput>(
    `/api/${editor.kind === "task" ? "tasks" : "projects"}${editor.value ? `/${editor.value.id}` : ""}`,
    editor.value ? "PATCH" : "POST",
    close,
  );
  const [name, setName] = useState(
    editor.value
      ? editor.kind === "task"
        ? editor.value.title
        : editor.value.name
      : "",
  );
  const [description, setDescription] = useState(
    editor.value?.description || "",
  );
  const [projectId, setProjectId] = useState(
    editor.kind === "task"
      ? editor.value?.project_id || editor.projectId || projects[0]?.id || 0
      : 0,
  );
  const [status, setStatus] = useState<Status>(
    editor.kind === "task"
      ? editor.value?.status || editor.status || "todo"
      : "todo",
  );
  const [priority, setPriority] = useState<Priority>(
    editor.kind === "task" ? editor.value?.priority || "medium" : "medium",
  );
  const [due, setDue] = useState(
    editor.kind === "task" ? editor.value?.due_date || "" : "",
  );
  function submit(e: FormEvent) {
    e.preventDefault();
    mutation.mutate(
      editor.kind === "project"
        ? { name: name.trim(), description }
        : {
            title: name.trim(),
            description,
            project_id: projectId,
            status,
            priority,
            due_date: due || null,
          },
    );
  }
  return (
    <Modal
      title={`${editor.value ? "Edit" : "Create"} ${editor.kind}`}
      close={close}
    >
      <form onSubmit={submit}>
        <label>
          {editor.kind === "task" ? "Task title" : "Project name"}
          <input
            autoFocus
            required
            maxLength={editor.kind === "task" ? 200 : 120}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={
              editor.kind === "task"
                ? "What needs to get done?"
                : "Give your project a name"
            }
          />
        </label>
        <label>
          Description
          <textarea
            maxLength={10000}
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add a little context…"
          />
        </label>
        {editor.kind === "task" && (
          <>
            <label>
              Project
              <select
                required
                aria-label="Project"
                value={projectId || ""}
                onChange={(e) => setProjectId(Number(e.target.value))}
              >
                <option value="" disabled>
                  Select a project
                </option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="form-grid">
              <label>
                Status
                <select
                  aria-label="Status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as Status)}
                >
                  {statuses.map((s) => (
                    <option key={s} value={s}>
                      {statusLabel[s]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Priority
                <select
                  aria-label="Priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as Priority)}
                >
                  {["low", "medium", "high"].map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              Due date <span className="muted">(optional)</span>
              <input
                type="date"
                value={due}
                onChange={(e) => setDue(e.target.value)}
              />
            </label>
          </>
        )}
        <div className="form-actions">
          <button type="button" className="secondary" onClick={close}>
            Cancel
          </button>
          <button
            className="primary"
            disabled={
              mutation.isPending ||
              !name.trim() ||
              (editor.kind === "task" && !projectId)
            }
          >
            {mutation.isPending
              ? "Saving…"
              : editor.value
                ? "Save changes"
                : `Create ${editor.kind}`}
          </button>
        </div>
      </form>
    </Modal>
  );
}
export function DeleteDialog({
  item,
  close,
  after,
}: {
  item: Project | Task;
  close: () => void;
  after: () => void;
}) {
  const project = "name" in item;
  const mutation = useWrite<undefined>(
    `/api/${project ? "projects" : "tasks"}/${item.id}`,
    "DELETE",
    () => {
      close();
      after();
    },
  );
  return (
    <Modal title={`Delete ${project ? "project" : "task"}?`} close={close}>
      <p>
        “{project ? item.name : item.title}” will be permanently deleted.
        {project ? " All tasks in this project will also be deleted." : ""}
      </p>
      <div className="form-actions">
        <button className="secondary" onClick={close}>
          Cancel
        </button>
        <button
          className="danger"
          disabled={mutation.isPending}
          onClick={() => mutation.mutate(undefined)}
        >
          {mutation.isPending ? "Deleting…" : "Delete permanently"}
        </button>
      </div>
    </Modal>
  );
}
