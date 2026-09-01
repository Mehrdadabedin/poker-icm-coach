// API client for the FastAPI backend (part 034 endpoints).
import { ActionKind, TableState } from "../models/game";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`API ${response.status}: ${body}`);
  }
  return response.json() as Promise<T>;
}

export function createTournament(fastMode = 10): Promise<TableState> {
  // Stack/blinds/duration come from the runtime tournament settings
  // (editable on the Tournament Settings screen); fast mode may be passed.
  return request<TableState>("/api/tournament", {
    method: "POST",
    body: JSON.stringify({ players: 9, fast_mode: fastMode }),
  });
}

export function getState(tableId: string): Promise<TableState> {
  return request<TableState>(`/api/game/${tableId}/state`);
}

export function sendAction(
  tableId: string,
  kind: ActionKind,
  amount?: number,
): Promise<TableState> {
  return request<TableState>(`/api/game/${tableId}/action`, {
    method: "POST",
    body: JSON.stringify(amount !== undefined ? { kind, amount } : { kind }),
  });
}

export function nextHand(tableId: string): Promise<TableState> {
  return request<TableState>(`/api/game/${tableId}/next-hand`, { method: "POST" });
}

export function coachAdvice(tableId: string) {
  return request<{
    recommendedAction: string;
    confidence: number;
    reasoning: string;
    alternativeAction: string;
    detail: Record<string, string>;
  }>(`/api/game/${tableId}/coach`, { method: "POST" });
}

export function coachCompare(tableId: string) {
  return request<{
    heroAction: string;
    coachAction: string;
    grade: string;
    explanation: string;
  }>(`/api/game/${tableId}/coach/compare`, { method: "POST" });
}

export function rangeGrid(position: string, stackBb: number) {
  return request<{ position: string; stack_bb: number; grid: string[][] }>(
    `/api/ranges?position=${position}&stack_bb=${stackBb}`,
  );
}

export { request };
