/* The player's plan (plan 100): read once per session from /api/account and
 * shared by every screen. It only decides what the screens show; the server
 * refuses Pro requests with 402 whatever a screen does. */
import { useEffect, useSyncExternalStore } from "react";
import { getToken } from "./api";
import { AUTH_EVENT } from "./authEvent";
import { PRO_EVENT } from "./proRequired";
import { getAccount } from "./profileApi";

export interface Plan {
  /** true for a Pro plan and for an admin */
  pro: boolean;
  admin: boolean;
  /** false until the server answered: screens show no locks */
  known: boolean;
  /** the answer is not in yet and has not failed: the table waits before it calls the coach */
  loading: boolean;
}

const UNKNOWN: Plan = { pro: false, admin: false, known: false, loading: false };
const STARTING: Plan = { ...UNKNOWN, loading: true };
let plan = STARTING;
let loadedFor: string | null = null;
const listeners = new Set<() => void>();

function publish(next: Plan): void {
  plan = next;
  listeners.forEach((listen) => listen());
}

function load(): void {
  const token = getToken();
  if (!token) {
    loadedFor = null;
    publish(UNKNOWN);
    return;
  }
  if (loadedFor === token) return;
  loadedFor = token;
  publish(STARTING);
  getAccount()
    .then((account) => {
      if (loadedFor === token) publish({ pro: account.plan === "pro" || account.admin, admin: account.admin, known: true, loading: false });
    })
    .catch(() => {
      if (loadedFor === token) publish(UNKNOWN);
    });
}

export function resetPlan(): void {
  loadedFor = null;
  publish(STARTING);
}

export function usePlan(): Plan {
  useEffect(() => {
    load();
    const refused = () => publish({ pro: false, admin: false, known: true, loading: false });
    window.addEventListener(AUTH_EVENT, load);
    window.addEventListener(PRO_EVENT, refused);
    return () => {
      window.removeEventListener(AUTH_EVENT, load);
      window.removeEventListener(PRO_EVENT, refused);
    };
  }, []);
  return useSyncExternalStore((listen) => { listeners.add(listen); return () => { listeners.delete(listen); }; }, () => plan);
}

/** The Free player's view: locks and the Upgrade entries show only then. */
export const useIsFree = (): boolean => {
  const { pro, known } = usePlan();
  return known && !pro;
};
