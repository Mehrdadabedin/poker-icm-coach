import { useCallback, useEffect, useRef, useState } from "react";
import { TableState } from "../models/game";
import * as api from "../services/api";

/** Live game hook: polls the authoritative backend state. */
export function useGame(tableId: string | null) {
  const [state, setState] = useState<TableState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState(false);
  const tableIdRef = useRef(tableId);
  tableIdRef.current = tableId;
  const inFlight = useRef(false);

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
    if (!tableIdRef.current || inFlight.current) return undefined; // ignore double submits
    inFlight.current = true;
    setActing(true);
    try {
      const next = await api.sendAction(tableIdRef.current, kind as never, amount);
      setState(next);
      setError(null);
      return next;
    } catch (e) {
      setError((e as Error).message);
      return undefined;
    } finally {
      inFlight.current = false;
      setActing(false);
    }
  }, []);

  const nextHand = useCallback(async () => {
    if (!tableIdRef.current || inFlight.current) return;
    inFlight.current = true;
    try {
      setState(await api.nextHand(tableIdRef.current));
      setError(null);
    } catch (e) {
      // A 400 ("current hand is still in progress") must never break the
      // flow with an unhandled rejection; surface it and keep polling.
      setError((e as Error).message);
    } finally {
      inFlight.current = false;
    }
  }, []);

  return { state, error, act, nextHand, refresh, acting };
}