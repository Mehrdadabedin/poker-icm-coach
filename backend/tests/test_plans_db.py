"""Plans in PostgreSQL (plan 100): the table is created by the store, and the
first start makes every existing account Pro. Fresh schema per test. Skips
without a database.
"""
from __future__ import annotations

import uuid
from collections.abc import Iterator

import pytest
from sqlalchemy import Engine, create_engine, inspect, text
from sqlalchemy.exc import SQLAlchemyError

from app.core.config import settings, sqlalchemy_url
from app.database.session import engine as main_engine
from app.services import plans
from app.services.user_registry import auth_registry


def _reachable() -> bool:
    try:
        with main_engine.connect():
            return True
    except SQLAlchemyError:
        return False


pytestmark = pytest.mark.skipif(not _reachable(), reason="PostgreSQL is not running")


@pytest.fixture()
def db() -> Iterator[Engine]:
    schema = f"plan_test_{uuid.uuid4().hex[:8]}"
    with main_engine.begin() as connection:
        connection.execute(text(f'CREATE SCHEMA "{schema}"'))
    engine = create_engine(sqlalchemy_url(settings.database_url),
                           connect_args={"options": f"-csearch_path={schema}"})
    try:
        yield engine
    finally:
        plans.bind_plans(None, False)
        engine.dispose()
        with main_engine.begin() as connection:
            connection.execute(text(f'DROP SCHEMA "{schema}" CASCADE'))


def _accounts(*names: str) -> None:
    auth_registry._users = {n: {"salt": "s", "hash": "h"} for n in names}  # noqa: SLF001


def test_first_start_makes_existing_accounts_pro_and_later_ones_free(db: Engine) -> None:
    _accounts("OldOne", "OldTwo")
    store = plans.bind_plans(db, True)
    assert isinstance(store, plans.DatabasePlans)
    assert "user_plans" in inspect(db).get_table_names()
    row = store.get("OldOne")
    assert row is not None and (row.plan, row.source) == ("pro", "grandfathered")

    _accounts("OldOne", "OldTwo", "NewOne")  # registered after the first start
    plans.store.default_plan = "free"
    again = plans.bind_plans(db, True)  # a deploy: the table exists, nothing changes
    again.default_plan = "free"
    assert again.get("NewOne") is None and plans.plan_for("NewOne") == "free"
    assert again.get("OldTwo") is not None and plans.plan_for("OldTwo") == "pro"
    with db.connect() as connection:
        assert connection.execute(text("SELECT count(*) FROM user_plans")).scalar() == 2


def test_set_replace_and_delete(db: Engine) -> None:
    _accounts()
    store = plans.bind_plans(db, True)
    store.put(plans.PlanRow("Dbo", "pro", "admin"))
    store.put(plans.PlanRow("Dbo", "free", "admin"))
    found = store.get("Dbo")
    assert found is not None and found.plan == "free"
    assert store.delete("Dbo") is True and store.delete("Dbo") is False
