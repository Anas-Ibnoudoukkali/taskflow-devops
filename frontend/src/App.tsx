import { useState } from "react";
import { Link, NavLink, Route, Routes, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  CheckCheck,
  FolderKanban,
  LayoutDashboard,
  LayoutGrid,
  Menu,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { api, type Project, type Task, type Status } from "./api";
import { EditorForm, DeleteDialog, type Editor } from "./editors";
import { PageHeading, State, ProjectCard } from "./components";
import { Overview, ProjectPage } from "./pages";
import Board from "./Board";
export default function App() {
  const projects = useQuery({
    queryKey: ["projects"],
    queryFn: () => api<Project[]>("/api/projects"),
  });
  const [editor, setEditor] = useState<Editor | null>(null);
  const [deleting, setDeleting] = useState<Project | Task | null>(null);
  const [menu, setMenu] = useState(false);
  const navigate = useNavigate();
  const projectList = projects.data || [];
  const createTask = (projectId?: number, status?: Status) => {
    if (!projectList.length) {
      toast.info("Create a project before adding tasks");
      setEditor({ kind: "project" });
      return;
    }
    setEditor({ kind: "task", projectId, status });
  };
  return (
    <div className="app-shell">
      <aside className={menu ? "sidebar open" : "sidebar"}>
        <Link className="brand" to="/">
          <span className="brand-mark">
            <CheckCheck size={22} />
          </span>
          TaskFlow<span className="version">v1</span>
        </Link>
        <div className="workspace">
          <span className="avatar">T</span>
          <div>
            Personal workspace<small>Your space to make progress</small>
          </div>
        </div>
        <p className="nav-label">WORKSPACE</p>
        <nav onClick={() => setMenu(false)}>
          <NavLink to="/" end>
            <LayoutDashboard size={19} />
            Overview
          </NavLink>
          <NavLink to="/projects">
            <FolderKanban size={19} />
            Projects<span>{projectList.length}</span>
          </NavLink>
          <NavLink to="/tasks">
            <LayoutGrid size={19} />
            Task board
          </NavLink>
        </nav>
        <div className="sidebar-note">
          <span className="live-dot" /> A little progress, every day.
          <p>Great things happen one task at a time.</p>
        </div>
        <div className="profile">
          <span className="avatar">Y</span>
          <div>
            Your workspace<small>Single-user edition</small>
          </div>
        </div>
      </aside>
      {menu && (
        <button
          className="scrim"
          aria-label="Close menu"
          onClick={() => setMenu(false)}
        />
      )}
      <div className="main-shell">
        <header>
          <button
            className="mobile-menu icon-btn"
            aria-label="Open navigation"
            onClick={() => setMenu(!menu)}
          >
            <Menu />
          </button>
          <span className="breadcrumb">
            Workspace <span>/</span> <strong>TaskFlow</strong>
          </span>
          <span className="header-note">
            <span className="live-dot" /> Let’s make things happen
          </span>
          <span className="avatar small">Y</span>
        </header>
        <main>
          <Routes>
            <Route
              path="/"
              element={
                <Overview
                  projects={projectList}
                  createTask={createTask}
                  editTask={(t) => setEditor({ kind: "task", value: t })}
                />
              }
            />
            <Route
              path="/projects"
              element={
                <>
                  <PageHeading
                    eyebrow="A PLACE FOR EVERY IDEA"
                    title="Your projects"
                    subtitle="Big goals, broken down into meaningful work."
                    action={
                      <button
                        className="primary"
                        onClick={() => setEditor({ kind: "project" })}
                      >
                        <Plus size={18} />
                        New project
                      </button>
                    }
                  />
                  <State
                    loading={projects.isPending}
                    error={projects.error}
                    empty={!projectList.length}
                  >
                    <div className="project-grid">
                      {projectList.map((p, i) => (
                        <ProjectCard
                          key={p.id}
                          project={p}
                          index={i}
                          edit={() => setEditor({ kind: "project", value: p })}
                          remove={() => setDeleting(p)}
                        />
                      ))}
                    </div>
                  </State>
                </>
              }
            />
            <Route
              path="/projects/:id"
              element={
                <ProjectPage
                  projects={projectList}
                  projectError={projects.error}
                  createTask={createTask}
                  editProject={(p) => setEditor({ kind: "project", value: p })}
                  removeProject={setDeleting}
                  editTask={(t) => setEditor({ kind: "task", value: t })}
                  removeTask={setDeleting}
                />
              }
            />
            <Route
              path="/tasks"
              element={
                <>
                  <PageHeading
                    eyebrow="FOCUS. MOVE. FINISH."
                    title="Task board"
                    subtitle="A clear view of what’s next, what’s moving, and what’s done."
                    action={
                      <button className="primary" onClick={() => createTask()}>
                        <Plus size={18} />
                        New task
                      </button>
                    }
                  />
                  <Board
                    projects={projectList}
                    createTask={createTask}
                    edit={(t) => setEditor({ kind: "task", value: t })}
                    remove={setDeleting}
                  />
                </>
              }
            />
            <Route
              path="*"
              element={
                <div className="state">
                  <h1>Page not found</h1>
                  <Link to="/">Back to overview</Link>
                </div>
              }
            />
          </Routes>
        </main>
        <footer>
          Made for a more focused day.
          <span>TaskFlow · Your work, in flow.</span>
        </footer>
      </div>
      {editor && (
        <EditorForm
          key={`${editor.kind}-${editor.value?.id || "new"}`}
          editor={editor}
          close={() => setEditor(null)}
          projects={projectList}
        />
      )}
      {deleting && (
        <DeleteDialog
          item={deleting}
          close={() => setDeleting(null)}
          after={() => {
            if ("name" in deleting) navigate("/projects");
          }}
        />
      )}
    </div>
  );
}
