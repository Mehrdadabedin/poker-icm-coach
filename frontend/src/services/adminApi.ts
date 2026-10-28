/* Admin moderation calls: suspend, unsuspend and delete an account.
 * Kept out of api.ts, which is at the 200-line limit. The backend refuses
 * these for the caller's own account and for any admin. */
import { request } from "./api";

const userPath = (username: string) => `/api/admin/users/${encodeURIComponent(username)}`;

export function suspendUser(username: string): Promise<{ suspended: boolean }> {
  return request(`${userPath(username)}/suspend`, { method: "POST" });
}

export function unsuspendUser(username: string): Promise<{ suspended: boolean }> {
  return request(`${userPath(username)}/unsuspend`, { method: "POST" });
}

export type Plan = "free" | "pro";

/** Pro or Free for one account, until payments exist (plan 100). */
export function setUserPlan(username: string, plan: Plan): Promise<{ username: string; plan: Plan }> {
  return request(`${userPath(username)}/plan`, { method: "PUT", body: JSON.stringify({ plan }) });
}

export function deleteUser(username: string): Promise<{ deleted: boolean }> {
  return request(userPath(username), { method: "DELETE" });
}
