"""Free and Pro plans (plan 100).

A player has every feature when the plan is `pro` (and not expired) or when
they are an Admin. Everyone else is Free. No row means the store's
`default_plan`. Memory serves local runs and the tests; the database serves
Render. Existing accounts are made Pro once, when the table is first created.
"""
from __future__ import annotations

import logging
import threading
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Literal

from sqlalchemy import Engine, delete, inspect, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.exc import SQLAlchemyError

from app.models.orm_plans import user_plans
from app.services.user_registry import auth_registry

logger = logging.getLogger(__name__)

Plan = Literal["free", "pro"]
Source = Literal["grandfathered", "admin", "store", "web"]


@dataclass(frozen=True)
class PlanRow:
    owner: str
    plan: Plan
    source: Source
    since: datetime = field(default_factory=lambda: datetime.now(UTC))
    until: datetime | None = None


class MemoryPlans:
    default_plan: Plan = "free"

    def __init__(self) -> None:
        self._rows: dict[str, PlanRow] = {}
        self._lock = threading.Lock()

    def get(self, owner: str) -> PlanRow | None:
        with self._lock:
            return self._rows.get(owner)

    def put(self, row: PlanRow) -> PlanRow:
        with self._lock:
            self._rows[row.owner] = row
        return row

    def delete(self, owner: str) -> bool:
        with self._lock:
            return self._rows.pop(owner, None) is not None


class DatabasePlans(MemoryPlans):
    def __init__(self, engine: Engine, existing_accounts: list[str]) -> None:
        super().__init__()
        self._engine = engine
        # The table is new only on the first start with this plan: that start
        # makes every existing account Pro, in the same transaction.
        is_new = not inspect(engine).has_table(user_plans.name)
        with engine.begin() as connection:
            user_plans.create(connection, checkfirst=True)
            if is_new and existing_accounts:
                connection.execute(user_plans.insert(), [
                    {"owner": name, "plan": "pro", "source": "grandfathered"}
                    for name in existing_accounts])
        if is_new:
            logger.info("plans: %d existing accounts made Pro", len(existing_accounts))

    def get(self, owner: str) -> PlanRow | None:
        query = select(user_plans).where(user_plans.c.owner == owner)
        with self._engine.connect() as connection:
            found = connection.execute(query).mappings().first()
        if found is None:
            return None
        return PlanRow(found["owner"], found["plan"], found["source"], found["since"],
                       found["until"])

    def put(self, row: PlanRow) -> PlanRow:
        values = {"plan": row.plan, "source": row.source, "since": row.since,
                  "until": row.until, "updated_at": datetime.now(UTC)}
        upsert = insert(user_plans).values(owner=row.owner, **values)
        upsert = upsert.on_conflict_do_update(index_elements=[user_plans.c.owner], set_=values)
        try:
            with self._engine.begin() as connection:
                connection.execute(upsert)
        except SQLAlchemyError as exc:
            logger.error("could not save a plan (%s)", type(exc).__name__)
            raise
        return row

    def delete(self, owner: str) -> bool:
        with self._engine.begin() as connection:
            gone = connection.execute(delete(user_plans).where(user_plans.c.owner == owner))
            return bool(gone.rowcount)


store: MemoryPlans = MemoryPlans()


def bind_plans(engine: Engine | None, use_database: bool) -> MemoryPlans:
    """Pick where plans live. Bind the user registry first: its accounts are
    the ones made Pro on the first start. An unreachable database falls back
    to memory rather than stopping the app."""
    global store
    store = MemoryPlans()
    if use_database and engine is not None:
        try:
            store = DatabasePlans(engine, [n for n, _ in auth_registry.account_snapshot()])
        except SQLAlchemyError:
            logger.warning("plan database unreachable; plans last until restart")
    return store


def plan_for(user: str) -> Plan:
    row = store.get(user)
    if row is None:
        return store.default_plan
    if row.plan == "pro" and row.until is not None and row.until <= datetime.now(UTC):
        return "free"
    return row.plan


def is_pro(user: str) -> bool:
    return plan_for(user) == "pro" or auth_registry.is_admin(user)


def set_plan(user: str, plan: Plan) -> PlanRow:
    return store.put(PlanRow(user, plan, "admin"))
