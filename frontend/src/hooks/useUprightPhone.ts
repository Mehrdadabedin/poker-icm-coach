import { useSyncExternalStore } from "react";

/** The one rule styles/mobile.css uses for a phone held upright. */
const UPRIGHT = "(max-width: 767px) and (max-aspect-ratio: 4/3)";

function subscribe(onChange: () => void): () => void {
  const list = window.matchMedia?.(UPRIGHT);
  list?.addEventListener("change", onChange);
  return () => list?.removeEventListener("change", onChange);
}

/** True on a phone held upright: the table drops its side panels for a coach strip (plan 101). */
export function useUprightPhone(): boolean {
  return useSyncExternalStore(subscribe, () => window.matchMedia?.(UPRIGHT).matches ?? false, () => false);
}
