from datetime import datetime, timedelta, timezone

import pytest
from pydantic import ValidationError

from app.schemas.entities import TaskCreate, TaskUpdate


def project(client, name="Website launch"):
    result = client.post(
        "/api/projects", json={"name": name, "description": "Ship something useful"}
    )
    assert result.status_code == 201
    return result.json()["id"]


def task(client, pid, **fields):
    result = client.post(
        "/api/tasks", json={"project_id": pid, "title": "Design homepage", **fields}
    )
    assert result.status_code == 201
    return result.json()


def test_project_lifecycle_and_cascade(client):
    pid = project(client)
    assert client.get("/api/projects").json()[0]["name"] == "Website launch"
    assert (
        client.patch(f"/api/projects/{pid}", json={"name": "Launched"}).json()["name"] == "Launched"
    )
    t = task(client, pid)
    assert client.get(f"/api/projects/{pid}").json()["total_tasks"] == 1
    assert client.delete(f"/api/projects/{pid}").status_code == 204
    assert client.get(f"/api/tasks/{t['id']}").status_code == 404
    assert client.get(f"/api/projects/{pid}").status_code == 404


def test_task_lifecycle_reassignment_and_due_date(client):
    pid = project(client)
    t = task(client, pid, due_date="2030-01-01")
    second = project(client, "Second")
    result = client.patch(
        f"/api/tasks/{t['id']}",
        json={
            "title": "Review homepage",
            "description": "Review copy",
            "status": "in_progress",
            "priority": "high",
            "due_date": None,
            "project_id": second,
        },
    )
    assert result.status_code == 200
    assert result.json()["due_date"] is None
    assert result.json()["project_id"] == second
    assert client.get(f"/api/projects/{second}").json()["in_progress_tasks"] == 1
    assert client.get(f"/api/projects/{pid}").json()["total_tasks"] == 0
    assert client.delete(f"/api/tasks/{t['id']}").status_code == 204
    assert client.get(f"/api/tasks/{t['id']}").status_code == 404


def test_filters_and_literal_search(client):
    pid = project(client)
    task(client, pid, title="Design 100%", status="done", priority="high")
    task(client, pid, title="Write copy", description="Homepage", priority="low")
    assert len(client.get("/api/tasks?q=homepage").json()) == 1
    assert len(client.get("/api/tasks?q=%25").json()) == 1
    assert len(client.get("/api/tasks?status=done&priority=high").json()) == 1
    assert len(client.get("/api/tasks?priority=medium").json()) == 0
    assert len(client.get(f"/api/tasks?project_id={pid}").json()) == 2
    assert client.get("/api/tasks?status=invalid").status_code == 422


def test_dashboard_counts_and_overdue(client):
    pid = project(client)
    yesterday = (datetime.now(timezone.utc).date() - timedelta(days=1)).isoformat()
    task(client, pid, status="todo", due_date=yesterday)
    task(client, pid, status="in_progress")
    task(client, pid, status="done", due_date=yesterday)
    stats = client.get("/api/dashboard").json()
    assert {k: stats[k] for k in stats if k != "recent_tasks"} == {
        "total_projects": 1,
        "total_tasks": 3,
        "completed_tasks": 1,
        "in_progress_tasks": 1,
        "overdue_tasks": 1,
    }
    assert len(stats["recent_tasks"]) == 3
    assert stats["recent_tasks"][0]["status"] == "done"


@pytest.mark.parametrize("body", [{"name": " "}, {"name": "x" * 121}, {"name": None}])
def test_invalid_projects(client, body):
    assert client.post("/api/projects", json=body).status_code == 422


def test_invalid_tasks_and_missing_resources(client):
    pid = project(client)
    for fields in [
        {"title": " "},
        {"status": "invalid"},
        {"priority": "urgent"},
        {"due_date": "not-a-date"},
        {"project_id": 0},
    ]:
        assert (
            client.post(
                "/api/tasks", json={"project_id": pid, "title": "Valid", **fields}
            ).status_code
            == 422
        )
    assert (
        client.post("/api/tasks", json={"project_id": 9999, "title": "Missing"}).status_code == 404
    )
    t = task(client, pid)
    assert client.patch(f"/api/tasks/{t['id']}", json={"title": None}).status_code == 422
    assert client.patch(f"/api/tasks/{t['id']}", json={"project_id": 9999}).status_code == 404
    assert client.delete("/api/tasks/9999").status_code == 404
    assert client.patch(f"/api/projects/{pid}", json={"name": None}).status_code == 422


def test_health_and_cors(client):
    assert client.get("/health").json() == {"status": "ok"}
    result = client.options(
        "/api/tasks",
        headers={"Origin": "http://localhost:8080", "Access-Control-Request-Method": "POST"},
    )
    assert result.headers["access-control-allow-origin"] == "http://localhost:8080"


def test_schema_trimming_and_patch_rules():
    assert TaskCreate(project_id=1, title="  Test  ").title == "Test"
    assert TaskUpdate(due_date=None).model_dump(exclude_unset=True) == {"due_date": None}
    with pytest.raises(ValidationError):
        TaskUpdate(status=None)


def test_readiness_database_failure(client, monkeypatch):
    from sqlalchemy.exc import OperationalError

    from app.main import engine

    def unavailable():
        raise OperationalError("SELECT 1", {}, Exception("database offline"))

    monkeypatch.setattr(engine, "connect", unavailable)
    result = client.get("/ready")
    assert result.status_code == 503
    assert result.json() == {"status": "unavailable"}
    assert client.get("/health").status_code == 200
