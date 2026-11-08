"""Create projects and tasks."""

import sqlalchemy as sa

from alembic import op

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def timestamps():
    return [
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
    ]


def upgrade():
    op.create_table(
        "projects",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        *timestamps(),
        sa.CheckConstraint("length(trim(name)) > 0", name="project_name_nonempty"),
    )
    op.create_table(
        "tasks",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "project_id",
            sa.Integer(),
            sa.ForeignKey("projects.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column("status", sa.String(20), nullable=False, server_default="todo"),
        sa.Column("priority", sa.String(10), nullable=False, server_default="medium"),
        sa.Column("due_date", sa.Date(), nullable=True),
        *timestamps(),
        sa.CheckConstraint("status IN ('todo', 'in_progress', 'done')", name="task_status"),
        sa.CheckConstraint("priority IN ('low', 'medium', 'high')", name="task_priority"),
        sa.CheckConstraint("length(trim(title)) > 0", name="task_title_nonempty"),
    )
    op.create_index("ix_tasks_project_status", "tasks", ["project_id", "status"])
    op.create_index("ix_tasks_due_date", "tasks", ["due_date"])


def downgrade():
    op.drop_table("tasks")
    op.drop_table("projects")
