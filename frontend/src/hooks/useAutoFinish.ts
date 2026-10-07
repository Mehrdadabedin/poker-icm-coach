import { useEffect, useRef } from "react";

/** A39/A44: BOT-only accelerated auto-finish after the hero is permanently
 * out. Runs only while the hero chose to WATCH TO THE END (enabled). */
export function useAutoFinish(options: {
  /** True once the hero picked WATCH TO THE END (A44). */
  enabled: boolean;
  paused: boolean;
  heroOut: boolean;
  phase: string | undefined;
  handNumber: number | undefined;
  playersRemaining: number | undefined;
  championName: string | null;
  /** Advance one hand, then refresh the table state. */
  next: () => void;
  /** Suppress the review countdown while auto-finishing. */
  stop: () => void;
  /** Restore the countdown afterwards. */
  start: () => void;
}): void {
  const latest = useRef(options);
  latest.current = options;

  useEffect(() => {
    const o = latest.current;
    if (o.paused || !o.enabled || !o.heroOut) return undefined;
    if (o.championName !== null) return undefined; // winner screen takes over
    if ((o.playersRemaining ?? 9) <= 1) return undefined;
    if (o.phase !== "handOver") return undefined;
    o.stop(); // suppress the 10 s review countdown in auto-finish mode
    const id = window.setInterval(() => latest.current.next(), 900);
    return () => {
      window.clearInterval(id);
      latest.current.start();
    };
  }, [options.enabled, options.paused, options.heroOut, options.phase,
      options.handNumber, options.playersRemaining, options.championName]);
}
