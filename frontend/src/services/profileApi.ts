/* Player profile, account details, data export and account deletion (plan 095). */
import { API_BASE, AuthError, getToken, getUsername } from "./api";

export type Gender = "man" | "woman" | "non_binary" | "self_described" | "prefer_not_to_say";
export const GENDERS: Gender[] = ["prefer_not_to_say", "woman", "man", "non_binary", "self_described"];

export interface Profile {
  firstName: string;
  lastName: string;
  displayName: string;
  birthday: string; // YYYY-MM-DD
  gender: Gender;
  genderText: string | null;
}
export type ProfileField = keyof Profile;

export interface Account {
  username: string;
  admin: boolean;
  signIn: "password" | "google";
  email: string | null;
}

/** A refused request: the HTTP status, and for a 422 the fields the server named. */
export class ApiStatusError extends Error {
  constructor(public status: number, public fields: ProfileField[] = []) {
    super(`API ${status}`);
    this.name = "ApiStatusError";
  }
}

interface ValidationIssue { loc?: (string | number)[] }

function fieldsOf(detail: unknown): ProfileField[] {
  if (!Array.isArray(detail)) return [];
  return (detail as ValidationIssue[])
    .map((issue) => issue.loc?.[issue.loc.length - 1])
    .filter((name): name is ProfileField => typeof name === "string" && name !== "body");
}

async function send<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (response.status === 401) throw new AuthError("Authentication required (API 401)");
  if (!response.ok) {
    let detail: unknown = null;
    try {
      detail = ((await response.json()) as { detail?: unknown }).detail;
    } catch {
      // a body that is not JSON names no fields
    }
    throw new ApiStatusError(response.status, fieldsOf(detail));
  }
  return response.json() as Promise<T>;
}

/** The player's profile, or null before the first save. */
export const getProfile = (): Promise<Profile | null> =>
  send<Profile>("/api/profile").catch((error: unknown) => {
    if (error instanceof ApiStatusError && error.status === 404) return null;
    throw error;
  });

export const saveProfile = (profile: Profile): Promise<Profile> =>
  send<Profile>("/api/profile", { method: "PUT", body: JSON.stringify(profile) });

export const getAccount = (): Promise<Account> => send<Account>("/api/account");

export const deleteAccount = (proof: { password?: string; confirm?: "DELETE" }): Promise<unknown> =>
  send<unknown>("/api/account", { method: "DELETE", body: JSON.stringify(proof) });

/** Save everything ICMBOT keeps about the player as a JSON file. */
export async function downloadMyData(): Promise<void> {
  const data = await send<unknown>("/api/account/export");
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `icmbot-data-${getUsername() ?? "player"}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

/** Whole years between the birthday and today, for the 18+ check before sending. */
export function ageOn(birthday: string, today: Date = new Date()): number {
  const [year, month, day] = birthday.split("-").map(Number);
  const before = today.getMonth() + 1 < month || (today.getMonth() + 1 === month && today.getDate() < day);
  return today.getFullYear() - year - (before ? 1 : 0);
}
