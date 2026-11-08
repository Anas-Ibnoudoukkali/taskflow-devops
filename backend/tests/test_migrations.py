from alembic.config import Config
from sqlalchemy import create_engine, inspect

from alembic import command


def test_migration_round_trip(tmp_path, monkeypatch):
    from app.core.config import get_settings

    url = f"sqlite:///{tmp_path / 'migration.db'}"
    monkeypatch.setenv("DATABASE_URL", url)
    get_settings.cache_clear()
    config = Config("alembic.ini")
    try:
        command.upgrade(config, "head")
        engine = create_engine(url)
        assert {"projects", "tasks"}.issubset(inspect(engine).get_table_names())
        assert "ix_tasks_project_status" in {
            i["name"] for i in inspect(engine).get_indexes("tasks")
        }
        command.check(config)
        command.downgrade(config, "base")
        assert "tasks" not in inspect(engine).get_table_names()
        command.upgrade(config, "head")
        engine.dispose()
    finally:
        get_settings.cache_clear()
