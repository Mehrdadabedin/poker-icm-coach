import { useCallback, useEffect, useRef, useState } from "react";
import { TableState } from "../models/game";
import * as api from "../services/api";

/** Live game hook: polls the authoritative backend state. */
export function useGame(tableId: string | null) {
  const [state, setState] = useState<TableState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const tableIdRef = useRef(tableId);
  tableIdRef.current = tableId;

  const refresh = useCallback(async () => {
    if (!tableIdRef.current) return;
    try {
      setState(await api.getState(tableIdRef.current));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), 350);
    return () => clearInterval(timer);
  }, [refresh, tableId]);

  const act = useCallback(async (kind: string, amount?: number) => {
    if (!tableIdRef.current) return;
    try {
      setState(await api.sendAction(tableIdRef.current, kind as never, amount));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  const nextHand = useCallback(async () => {
    if (!tableIdRef.current) return;
    setState(await api.nextHand(tableIdRef.current));
  }, []);

  return { state, error, act, nextHand, refresh };
}
