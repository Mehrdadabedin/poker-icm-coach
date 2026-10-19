import { useCallback } from "react";
import type { ActionKind, TableState } from "../models/game";
import {
  clearAuth,
  createTournament,
  logout,
  nextHand as requestNextHand,
  reentry as requestReentry,
  request,
  sendAction,
} from "../services/api";

export interface TableActionsOptions {
  tableId: string;
  refresh: () => void;
  navigate: (path: string) => void;
  /** Same-lineup replay for START NEW GAME (A44), when available. */
  lineup: string[] | null;
}

/** Table action handlers shared by the live table and the WebMCP tools. */
export function useTableActions({
  tableId, refresh, navigate, lineup,
}: TableActionsOptions) {
  const act = useCallback(async (kind: ActionKind, amount?: number) =>
    sendAction(tableId, kind, amount), [tableId]);

  const nextHand = useCallback(async () => {
    const next = await requestNextHand(tableId);
    refresh();
    return next;
  }, [tableId, refresh]);

  const continueReentry = useCallback(async () => {
    try {
      await requestReentry(tableId);
      refresh();
    } catch {
      // the next poll reflects the backend state regardless
    }
  }, [tableId, refresh]);

  /** Plan 092: the busted hero ends the tournament; places follow the chips. */
  const endGame = useCallback(async () => {
    try {
      await request<TableState>(`/api/game/${encodeURIComponent(tableId)}/end`, { method: "POST" });
    } finally {
      refresh();
    }
  }, [tableId, refresh]);

  /** A44: fresh tournament, same band lineup, starts at Level 1. */
  const startNewGame = useCallback(async () => {
    const next = await createTournament(10, undefined, lineup ?? undefined);
    navigate(`/table/${next.tableId}`);
    return next;
  }, [lineup, navigate]);

  const signOut = useCallback(async () => {
    try {
      await logout();
    } catch {
      // token may already be revoked server-side; clear locally regardless
    }
    clearAuth();
    navigate("/");
  }, [navigate]);

  return { act, nextHand, continueReentry, endGame, startNewGame, signOut };
}

export type { TableState };
