import { useEffect, useState } from "react";
import type { HandHistoryEntry } from "../models/game";
import { request } from "../services/api";

/** The table owner's completed hands: one read-only GET, repeated when a hand
 * completes (handNumber advances), not on the 350 ms state poll. */
export function useTableHands(tableId: string, handNumber: number, enabled: boolean): HandHistoryEntry[] | null {
  const [hands, setHands] = useState<HandHistoryEntry[] | null>(null);
  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    request<{ hands: HandHistoryEntry[] }>(`/api/game/${encodeURIComponent(tableId)}/hands`)
      .then((data) => {
        if (!cancelled) setHands(data.hands);
      })
      .catch(() => {
        if (!cancelled) setHands([]);
      });
    return () => {
      cancelled = true;
    };
  }, [tableId, handNumber, enabled]);
  return hands;
}
