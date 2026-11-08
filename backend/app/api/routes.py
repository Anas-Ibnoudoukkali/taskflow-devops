from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.entities import Project, Task
from app.schemas.entities import (
    Dashboard,
    Priority,
    ProjectCreate,
    ProjectRead,
    ProjectUpdate,
    Status,
    TaskCreate,
    TaskRead,
    TaskUpdate,
)

router = APIRouter(prefix="/api")


def require(db, model, item_id):
    item = db.get(model, item_id)
    if item is None:
        raise HTTPException(404, f"{model.__name__} not found")
    return item


def project_read(db, project):
    counts = dict(
        db.execute(
            select(Task.status, func.count())
            .where(Task.project_id == project.id)
            .group_by(Task.status)
        ).all()
    )
    return ProjectRead.model_validate(project).model_copy(
        update={
            "total_tasks": sum(counts.values()),
            "completed_tasks": counts.get("done", 0),
            "in_progress_tasks": counts.get("in_progress", 0),
        }
    )


@router.get("/projects", response_model=list[ProjectRead])
def projects(db: Session = Depends(get_db)):
    return [project_read(db, p) for p in db.scalars(select(Project).order_by(Project.id.desc()))]


@router.post("/projects", response_model=ProjectRead, status_code=201)
def create_project(body: ProjectCreate, db: Session = Depends(get_db)):
    item = Project(**body.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return project_read(db, item)


@router.get("/projects/{item_id}", response_model=ProjectRead)
def get_project(item_id: int, db: Session = Depends(get_db)):
    return project_read(db, require(db, Project, item_id))


@router.patch("/projects/{item_id}", response_model=ProjectRead)
def update_project(item_id: int, body: ProjectUpdate, db: Session = Depends(get_db)):
    item = require(db, Project, item_id)
    for key, value in body.model_dump(exclude_unset=True).items():
        setattr(item, key, value)
    db.commit()
    db.refresh(item)
    return project_read(db, item)


@router.delete("/projects/{item_id}", status_code=204)
def delete_project(item_id: int, db: Session = Depends(get_db)):
    db.delete(require(db, Project, item_id))
    db.commit()
    return Response(status_code=204)


@router.get("/tasks", response_model=list[TaskRead])
def tasks(
    project_id: int | None = None,
    status: Status | None = None,
    priority: Priority | None = None,
    q: str = Query("", max_length=200),
    db: Session = Depends(get_db),
):
    statement = select(Task)
    for column, value in [
        (Task.project_id, project_id),
        (Task.status, status),
        (Task.priority, priority),
    ]:
        if value is not None:
            statement = statement.where(column == value)
    if q.strip():
        pattern = (
            "%" + q.strip().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%"
        )
        statement = statement.where(
            or_(
                Task.title.ilike(pattern, escape="\\"), Task.description.ilike(pattern, escape="\\")
            )
        )
    return db.scalars(statement.order_by(Task.created_at.desc(), Task.id.desc())).all()


@router.post("/tasks", response_model=TaskRead, status_code=201)
def create_task(body: TaskCreate, db: Session = Depends(get_db)):
    require(db, Project, body.project_id)
    item = Task(**body.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.get("/tasks/{item_id}", response_model=TaskRead)
def get_task(item_id: int, db: Session = Depends(get_db)):
    return require(db, Task, item_id)


@router.patch("/tasks/{item_id}", response_model=TaskRead)
def update_task(item_id: int, body: TaskUpdate, db: Session = Depends(get_db)):
    item = require(db, Task, item_id)
    if body.project_id is not None:
        require(db, Project, body.project_id)
    for key, value in body.model_dump(exclude_unset=True).items():
        setattr(item, key, value)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/tasks/{item_id}", status_code=204)
def delete_task(item_id: int, db: Session = Depends(get_db)):
    db.delete(require(db, Task, item_id))
    db.commit()
    return Response(status_code=204)


@router.get("/dashboard", response_model=Dashboard)
def dashboard(db: Session = Depends(get_db)):
    counts = dict(db.execute(select(Task.status, func.count()).group_by(Task.status)).all())
    return {
        "total_projects": db.scalar(select(func.count()).select_from(Project)),
        "total_tasks": sum(counts.values()),
        "completed_tasks": counts.get("done", 0),
        "in_progress_tasks": counts.get("in_progress", 0),
        "overdue_tasks": db.scalar(
            select(func.count())
            .select_from(Task)
            .where(Task.due_date < datetime.now(timezone.utc).date(), Task.status != "done")
        ),
        "recent_tasks": db.scalars(
            select(Task).order_by(Task.created_at.desc(), Task.id.desc()).limit(6)
        ).all(),
    }
