/* Stepping away from a table (plan 063). Leaving the table for HOME or MY
 * MISTAKES stops the tournament clock on the server; coming back restarts it.
 * The table is remembered so every page can offer BACK TO TABLE. */
import { request } from "./api";

const KEY = "icm_away_table";
/** Fired when the remembered table changes. The table page records it in its
 * cleanup, which React runs after the next page has already rendered. */
export const AWAY_CHANGED = "icm-away-table-changed";

function announce(): void {
  window.dispatchEvent(new Event(AWAY_CHANGED));
}

export type AwayTable = { tableId: string; label: string };

export function awayTable(): AwayTable | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const { tableId, label } = parsed as Record<string, unknown>;
    return typeof tableId === "string" && tableId
      ? { tableId, label: typeof label === "string" ? label : "" }
      : null;
  } catch {
    return null;
  }
}

export function stepAway(tableId: string, label: string): Promise<unknown> {
  try {
    localStorage.setItem(KEY, JSON.stringify({ tableId, label }));
  } catch {
    // storage blocked: the clock still stops, only BACK TO TABLE is lost
  }
  announce();
  return request(`/api/game/${encodeURIComponent(tableId)}/away`, { method: "POST" });
}

export function forgetAwayTable(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // nothing to clean up
  }
  announce();
}

export function comeBack(tableId: string): Promise<unknown> {
  forgetAwayTable();
  return request(`/api/game/${encodeURIComponent(tableId)}/back`, { method: "POST" });
}
