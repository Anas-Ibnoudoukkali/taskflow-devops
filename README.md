# TaskFlow

A single-user project and task workspace built with React, FastAPI, and PostgreSQL.
Manage projects, organize tasks on a Kanban board, and track progress from a responsive dashboard.
No authentication, cloud resources, or Kubernetes deployment is included.

```mermaid
flowchart LR
    Browser[Browser · React SPA] -->|same-origin /api| Nginx[Nginx · frontend container]
    Nginx -->|Docker network| API[FastAPI · Python 3.13]
    API -->|SQLAlchemy / psycopg| DB[(PostgreSQL 17)]
    Alembic[Alembic migrations at backend startup] --> DB
```

## Features

- Create, edit, and delete projects; project deletion also deletes its tasks, after confirmation.
- Project details with total, in-progress, and completed task counts.
- Create/edit/delete tasks, assign or move them between projects, and set priority and optional due date.
- Kanban statuses: To Do, In Progress, Done. Drag cards between columns or use each card’s status dropdown (keyboard/touch accessible).
- Search task titles and descriptions, combined with project, priority, and status filters.
- Dashboard with five statistics, six newest tasks, completion progress, and project summaries.
- Responsive navigation, native modal dialogs, empty/loading/error states, and success/error toasts.
- Data comes from the API; no mock data or automatic sample records.

## Stack and layout

Frontend: React 19, TypeScript, Vite, Tailwind CSS 4, React Router, TanStack Query, Lucide icons, Sonner notifications.
Backend: Python 3.13, FastAPI, SQLAlchemy 2, Pydantic 2, psycopg, Alembic, Pytest, Ruff.
Database: PostgreSQL 17. Local runtime: Docker Compose; unprivileged backend and Nginx containers.

```text
frontend/
  src/             # Shell, pages, board, forms, shared components, typed API client
  Dockerfile       # Node build → unprivileged Nginx
  nginx.conf       # SPA fallback for deep links
backend/
  app/api/         # REST endpoints and dashboard queries
  app/core/        # Environment settings
  app/db/          # Engine and request-scoped sessions
  app/models/      # SQLAlchemy entities, relationships, constraints, indexes
  app/schemas/     # Request/response validation
  alembic/         # Versioned schema migrations
  tests/           # Unit, API, and migration tests
infra/README.md    # Future deployment work, no infrastructure
compose.yaml
.env.example
```

## Run locally

Requires Docker Engine/Desktop with Compose v2. From the repository root:

```sh
cp .env.example .env
# Edit .env: replace POSTGRES_PASSWORD with a local password.
docker compose up --build -d --wait
```

Open **http://localhost:8080**. API documentation: **http://localhost:8000/docs**.
Create a project, then add tasks. Both published ports bind only to loopback.
PostgreSQL is accessible only on the Compose application network by default.

```sh
docker compose ps
docker compose logs -f backend
curl --fail http://localhost:8000/health
curl --fail http://localhost:8000/ready
docker compose down
```

`down` preserves the named database volume. `docker compose down -v` permanently deletes local data.

### Environment variables

| Variable | Purpose |
| --- | --- |
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | Database initialization and backend connection; required by Compose |
| `FRONTEND_PORT`, `BACKEND_PORT` | Published local ports (8080 / 8000) |
| `CORS_ORIGINS` | JSON array of allowed browser origins |
| `DATABASE_URL` | Required by the standalone backend and Alembic; Compose constructs it from database settings |

Use URL-safe database credentials (letters, numbers, hyphens) with the Compose URL template.
For standalone URLs, percent-encode reserved password characters.
The frontend calls `/api` on its own origin. Nginx forwards those requests to `backend:8000` on the Compose network; Vite forwards them to `localhost:8000` during standalone development. The browser never needs to resolve the Docker service name or connect directly to port 8000. `VITE_API_URL` is no longer used; remove it from an existing `.env` if present. Changing the frontend port does not require rebuilding the API address. Update `CORS_ORIGINS` if you make direct cross-origin API calls from another origin.
Database initialization variables only apply to a new volume; changing `.env` does not change an existing database password.
No credentials belong in source control; `.env` is ignored.

### Develop outside the containers

Python 3.13 and Node 22.12+ (or current Node 24) are required. Start PostgreSQL with Compose.
For a host backend, expose PostgreSQL with a **local, ignored override** such as `.env.postgres-ports.yaml`:

```yaml
services:
  postgres:
    ports: ["127.0.0.1:5432:5432"]
```

```sh
docker compose -f compose.yaml -f .env.postgres-ports.yaml up -d postgres
cd backend
python3.13 -m venv .venv
. .venv/bin/activate
pip install -r requirements-dev.txt
# Set DATABASE_URL securely in your shell (or backend/.env):
# postgresql+psycopg://USER:URL_ENCODED_PASSWORD@localhost:5432/DB
alembic upgrade head
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

In another terminal:

```sh
cd frontend
npm ci
npm run dev
```

Browse http://localhost:5173. The Vite development server proxies `/api` to the backend on port 8000.

## Migrations

The backend starts only after PostgreSQL is healthy, applies `alembic upgrade head`, then starts Uvicorn.
Migrations are the only application schema initialization mechanism (no create-all on app startup).

```sh
docker compose exec backend alembic current
docker compose exec backend alembic check
docker compose exec backend alembic upgrade head
# Development only; downgrading the initial migration destroys application tables:
# docker compose exec backend alembic downgrade base
```

For a schema change, edit models and run `alembic revision --autogenerate -m "describe change"`
from `backend/` with dependencies and `DATABASE_URL` configured. Review the generated migration.
Timestamps are UTC; `updated_at` is maintained on SQLAlchemy updates. Due dates are calendar dates;
overdue means before today in UTC and not Done. Indexes cover project/status and due date.

## API

| Method | Path | Behavior |
| --- | --- | --- |
| GET / POST | `/api/projects` | List with statistics / create |
| GET / PATCH / DELETE | `/api/projects/{id}` | Read / partially update / delete with tasks |
| GET / POST | `/api/tasks` | Filtered list / create |
| GET / PATCH / DELETE | `/api/tasks/{id}` | Read / partially update / delete |
| GET | `/api/dashboard` | Counts and newest six tasks |
| GET | `/health` | Process liveness |
| GET | `/ready` | Database connectivity (`SELECT 1`), 503 on failure |

Task filters: `q`, `project_id`, `status` (`todo`, `in_progress`, `done`), `priority` (`low`, `medium`, `high`).
Creates return 201, deletes 204, missing records 404, invalid fields 422, conflicts 409, database failures 503.
PATCH omits unchanged fields; only `due_date` accepts explicit null to clear it.
Database failures log the exception class without connection credentials or submitted SQL parameters.
Readiness checks connectivity, not schema revision; startup migrations must succeed before Uvicorn starts.

## Tests and quality

```sh
cd backend
. .venv/bin/activate
pip install -r requirements-dev.txt
pytest -q
ruff check .
ruff format --check .
cd ../frontend
npm ci
npm run lint
npm run typecheck
npm run build
```

Default tests use isolated SQLite databases with foreign keys enabled. The migration test upgrades,
checks schema drift, downgrades, and upgrades again. To run API tests against PostgreSQL, first
create a **dedicated disposable database** (never use your application database), then set
`TEST_DATABASE_URL=postgresql+psycopg://.../taskflow_test` before `pytest -q`.
API fixtures create and **drop all application tables** in the selected test database for each test.
The migration round-trip always uses a separate temporary SQLite file.

## CI and container images

`.github/workflows/ci.yml` runs on pull requests and pushes to `main`:

- **Backend checks:** Python 3.13, Pytest, Ruff lint, and Ruff format check.
- **Frontend checks:** Node.js 22, `npm ci`, ESLint, TypeScript typecheck, and production build.
- **Publish GHCR images:** after both check jobs succeed on a push to `main`, builds the existing Dockerfiles and pushes each image with the full commit SHA and `latest` tags. Pull requests never publish. The publish job alone has `packages: write`; all jobs have `contents: read`.

After a successful `main` run, find the packages under the repository's **Packages** sidebar or the owner's **Packages** tab. For this repository, the image names are:

```text
ghcr.io/anas-ibnoudoukkali/taskflow-backend:<commit-sha>
ghcr.io/anas-ibnoudoukkali/taskflow-frontend:<commit-sha>
```

Both also receive the `latest` tag. Use the SHA tag for a future EKS rollout so the deployed image is fixed to a specific commit. Images are not published until this workflow runs successfully on `main`.

To allow public pulls, open each package's **Package settings** → **Danger Zone** → **Change visibility** → **Public**. Repeat for both images. Public GHCR container packages can then be pulled without registry credentials. GitHub notes that making a package public cannot be reversed to private; review each package before changing visibility. See [GitHub's package visibility guide](https://docs.github.com/en/packages/learn-github-packages/configuring-a-packages-access-control-and-visibility) and [container registry guide](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry).

## Limitations and next steps

- Single user, no authentication or authorization. Keep the application local until access control is added.
- Task/project lists are unpaginated; project list statistics use per-project queries. Add pagination and grouped queries before large datasets.
- No real-time collaboration, optimistic conflict detection, attachments, or task ordering within columns. Cards show newest first.
- Compose is for local development. Startup migrations assume one backend instance; production should run migrations as a separate release job.
- Images use version-family tags; pin immutable digests and add dependency scanning for production releases.
- Next: PostgreSQL migration checks and image scanning in CI, then reviewed Terraform/EKS/Helm and monitoring work. Nothing provisions AWS in this version.

### Browser smoke test

With the three Compose services running:

```sh
cd frontend
npx playwright install chromium
npm run test:e2e
# To use an existing Chromium installation instead:
# CHROMIUM_PATH=/usr/bin/chromium npm run test:e2e
```

Optional `E2E_FRONTEND_URL` / `E2E_API_URL` override the default local origins.
The test creates a uniquely named project, exercises project/task CRUD, status changes,
search, confirmation cancellation, reload persistence, deep links, and mobile navigation,
then deletes its own project. Run against a development instance.

A nested minimatch override in `frontend/package.json` keeps TypeScript ESLint's glob
matcher on its patched release; lint/type checking are verified with this override.

### Validation performed for the API connectivity fix

- Python 3.13: 13 Pytest cases passed with isolated SQLite databases; Ruff lint and format checks passed.
- Frontend ESLint and TypeScript checks passed; the production Docker frontend image built.
- All three Compose services were running; backend and PostgreSQL were healthy and `/ready` returned 200.
- PostgreSQL reported migration `0001 (head)`.
- Chromium smoke passed against the rebuilt Compose frontend, including project and task creation, a simulated 422 validation response, task retrieval, and reload persistence.
- Pytest emits one upstream AnyIO/Starlette deprecation warning.
