from datetime import date, datetime
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, model_validator

Name = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)]
Title = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]
Description = Annotated[str, StringConstraints(max_length=10000)]
Status = Literal["todo", "in_progress", "done"]
Priority = Literal["low", "medium", "high"]


class ProjectCreate(BaseModel):
    name: Name
    description: Description = ""


class NonNullPatch(BaseModel):
    @model_validator(mode="after")
    def disallow_null(self):
        for field in self.model_fields_set - {"due_date"}:
            if getattr(self, field) is None:
                raise ValueError(f"{field} cannot be null")
        return self


class ProjectUpdate(NonNullPatch):
    name: Name | None = None
    description: Description | None = None


class ProjectRead(ProjectCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    updated_at: datetime
    total_tasks: int = 0
    completed_tasks: int = 0
    in_progress_tasks: int = 0


class TaskCreate(BaseModel):
    project_id: int = Field(gt=0)
    title: Title
    description: Description = ""
    status: Status = "todo"
    priority: Priority = "medium"
    due_date: date | None = None


class TaskUpdate(NonNullPatch):
    project_id: int | None = Field(default=None, gt=0)
    title: Title | None = None
    description: Description | None = None
    status: Status | None = None
    priority: Priority | None = None
    due_date: date | None = None


class TaskRead(TaskCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    updated_at: datetime


class Dashboard(BaseModel):
    total_projects: int
    total_tasks: int
    completed_tasks: int
    in_progress_tasks: int
    overdue_tasks: int
    recent_tasks: list[TaskRead]
