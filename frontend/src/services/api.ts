// API client for the FastAPI backend (part 034 endpoints + A03 auth).
import { ActionKind, TableState } from "../models/game";

const API_BASE = import.meta.env.VITE_API_URL ?? "";
const TOKEN_KEY = "icm_auth_token";
const USERNAME_KEY = "icm_username";

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

export const getToken = (): string | null => localStorage.getItem(TOKEN_KEY);
export const getUsername = (): string | null => localStorage.getItem(USERNAME_KEY);
export const saveAuth = (token: string, username: string): void => {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USERNAME_KEY, username);
};
export const clearAuth = (): void => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USERNAME_KEY);
};

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!response.ok) {
    const body = await response.text();
    if (response.status === 401) {
      throw new AuthError(`Authentication required (API ${response.status})`);
    }
    throw new Error(`API ${response.status}: ${body}`);
  }
  return response.json() as Promise<T>;
}

// Auth requests surface the server's detail (e.g. "invalid username or
// password") as a clear, user-facing message instead of the generic 401 text.
async function authRequest<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    let msg = `API ${response.status}`;
    try {
      const data = (await response.json()) as { detail?: string };
      if (data.detail) msg = data.detail;
    } catch {
      // keep the generic message if the body is not JSON
    }
    throw new Error(msg);
  }
  return response.json() as Promise<T>;
}

export function register(
  username: string,
  password: string,
): Promise<{ username: string; registered: boolean }> {
  return authRequest<{ username: string; registered: boolean }>("/api/auth/register", {
    username,
    password,
  });
}

export function login(
  username: string,
  password: string,
): Promise<{ token: string; username: string }> {
  return authRequest<{ token: string; username: string }>("/api/auth/login", {
    username,
    password,
  });
}

export function logout(): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>("/api/auth/logout", { method: "POST" });
}

export function me(): Promise<{ username: string }> {
  return request<{ username: string }>("/api/auth/me");
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
