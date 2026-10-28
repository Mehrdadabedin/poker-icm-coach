/* Whether the Upgrade sheet (plan 100) is open: one sheet for the whole app. */
import { useSyncExternalStore } from "react";

let open = false;
const listeners = new Set<() => void>();

function set(next: boolean): void {
  open = next;
  listeners.forEach((listen) => listen());
}

export const openUpgrade = (): void => set(true);
export const closeUpgrade = (): void => set(false);
export const useUpgradeOpen = (): boolean =>
  useSyncExternalStore((listen) => { listeners.add(listen); return () => { listeners.delete(listen); }; }, () => open);
