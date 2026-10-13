"""Hand history saved in the database, per user and tournament (plan 076).

Hands used to live only in the table's memory (and a file on the host's
temporary disk), so a deploy or a restart erased a player's history. With
the database archive every finished hand is saved the moment it ends, and the
tournament row follows its status and finish place.

Saving is best effort: a database error is logged and the game goes on. The
log never carries the exception text, which embeds the statement parameters.
"""
from __future__ import annotations

import logging
from datetime import UTC, datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import Engine, delete, func, select, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.exc import SQLAlchemyError

from app.models.orm_history import history_hands, history_tournaments
from app.services.hand_history import HandHistoryRecord, record_to_dict

if TYPE_CHECKING:  # pragma: no cover - import cycle guard
    from app.services.game_session import GameSession

logger = logging.getLogger(__name__)


class NullArchive:
    """No saved history: local runs and the test suite (file storage)."""

    enabled = False

    def save_hand(self, session: GameSession, record: HandHistoryRecord) -> None:
        return None

    def save_tournament(self, session: GameSession) -> None:
        return None

    def tournaments(self, owner: str) -> list[dict[str, Any]]:
        return []

    def hands(self, owner: str, tournament_id: str) -> list[dict[str, Any]] | None:
        return None

    def hands_by_tournament(self, owner: str, ids: list[str]) -> dict[str, list[dict[str, Any]]]:
        return {}

    def delete_owner(self, owner: str) -> int:
        return 0


class DatabaseArchive(NullArchive):
    enabled = True

    def __init__(self, engine: Engine) -> None:
        self._engine = engine
        # Creates its own tables, so a host that never runs Alembic still works.
        history_tournaments.create(engine, checkfirst=True)
        history_hands.create(engine, checkfirst=True)

    def _upsert_tournament(self, connection: Any, session: GameSession) -> None:
        ended = datetime.now(UTC) if session.status != "active" else None
        row = insert(history_tournaments).values(
            id=session.session_id, owner=session.owner or "", table_label=session.table_label,
            started_at=datetime.fromtimestamp(session.created_at, UTC), ended_at=ended,
            status=session.status, finish_place=session.hero_finish_place,
            starting_stack=session.tournament_starting_stack, bots=session.bot_profiles,
        )
        connection.execute(row.on_conflict_do_update(
            index_elements=[history_tournaments.c.id],
            set_={"status": row.excluded.status, "finish_place": row.excluded.finish_place,
                  # the first end time sticks: a later save does not move it
                  "ended_at": func.coalesce(history_tournaments.c.ended_at, row.excluded.ended_at)},
        ))

    def save_tournament(self, session: GameSession) -> None:
        if not session.owner:
            return
        try:
            with self._engine.begin() as connection:
                self._upsert_tournament(connection, session)
        except SQLAlchemyError:
            logger.warning("could not save tournament %s", session.session_id)

    def save_hand(self, session: GameSession, record: HandHistoryRecord) -> None:
        if not session.owner:
            return
        try:
            with self._engine.begin() as connection:
                self._upsert_tournament(connection, session)
                added = connection.execute(insert(history_hands).values(
                    tournament_id=session.session_id, owner=session.owner,
                    hand_number=record.hand_number, net=record.net_chips(),
                    record=record_to_dict(record),
                ).on_conflict_do_nothing(constraint="uq_history_hand")
                    .returning(history_hands.c.id)).first()
                if added is not None:  # a hand saved twice is counted once
                    connection.execute(update(history_tournaments)
                                       .where(history_tournaments.c.id == session.session_id)
                                       .values(hands=history_tournaments.c.hands + 1))
        except SQLAlchemyError:
            logger.warning("could not save hand %s of table %s", record.hand_number, session.session_id)

    def tournaments(self, owner: str) -> list[dict[str, Any]]:
        query = (select(history_tournaments).where(history_tournaments.c.owner == owner)
                 .order_by(history_tournaments.c.started_at.desc()))
        with self._engine.connect() as connection:
            return [dict(row._mapping) for row in connection.execute(query)]

    def hands(self, owner: str, tournament_id: str) -> list[dict[str, Any]] | None:
        """The tournament's hands, oldest first; None when it is not the owner's."""
        mine = select(history_tournaments.c.id).where(
            history_tournaments.c.id == tournament_id, history_tournaments.c.owner == owner)
        query = (select(history_hands.c.record).where(history_hands.c.tournament_id == tournament_id)
                 .order_by(history_hands.c.hand_number))
        with self._engine.connect() as connection:
            if connection.execute(mine).first() is None:
                return None
            return [row.record for row in connection.execute(query)]

    def hands_by_tournament(self, owner: str, ids: list[str]) -> dict[str, list[dict[str, Any]]]:
        """The Report's hands (plan 078): several tournaments in one query,
        each oldest first. Only the owner's hands match."""
        if not ids:
            return {}
        query = (select(history_hands.c.tournament_id, history_hands.c.record)
                 .where(history_hands.c.owner == owner, history_hands.c.tournament_id.in_(ids))
                 .order_by(history_hands.c.tournament_id, history_hands.c.hand_number))
        found: dict[str, list[dict[str, Any]]] = {}
        with self._engine.connect() as connection:
            for row in connection.execute(query):
                found.setdefault(row.tournament_id, []).append(row.record)
        return found

    def delete_owner(self, owner: str) -> int:
        """Remove a deleted account's history; returns the tournaments removed."""
        with self._engine.begin() as connection:
            connection.execute(delete(history_hands).where(history_hands.c.owner == owner))
            return connection.execute(
                delete(history_tournaments).where(history_tournaments.c.owner == owner)).rowcount


archive: NullArchive = NullArchive()


def bind_history_archive(engine: Engine | None, use_database: bool) -> NullArchive:
    """Pick where history goes. An unreachable database leaves it unsaved
    rather than stopping the game."""
    global archive
    archive = NullArchive()
    if use_database and engine is not None:
        try:
            archive = DatabaseArchive(engine)
        except SQLAlchemyError:
            logger.warning("history database unreachable; hands are not saved")
    return archive
