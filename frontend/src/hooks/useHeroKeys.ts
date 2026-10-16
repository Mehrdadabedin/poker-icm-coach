import { useEffect, useRef } from "react";

export type HeroKey = "enter" | "fold" | "call" | "check" | "smaller" | "bigger";

const KEYS: Record<string, HeroKey> = {
  Enter: "enter", f: "fold", F: "fold", c: "call", C: "call", k: "check", K: "check",
  ArrowLeft: "smaller", "-": "smaller", ArrowRight: "bigger", "+": "bigger", "=": "bigger",
};

/** Keyboard play while it is the hero's turn: Enter plays the size shown on
 * the raise button, F folds, C calls, K checks, arrows or - and + change the
 * size. Keys typed into a field stay with the field, except Enter in the
 * amount box; Enter on a focused button is left to that button, except the
 * size buttons, where it plays the size just picked. */
export function useHeroKeys(active: boolean, handlers: Partial<Record<HeroKey, () => void>>): void {
  const latest = useRef(handlers);
  latest.current = handlers;
  useEffect(() => {
    if (!active) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const key = KEYS[e.key];
      const target = e.target instanceof HTMLElement ? e.target : null;
      const tag = target?.tagName ?? "";
      const typing = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
      const inAmount = target?.dataset.testid === "bet-amount";
      // Enter after tapping a size plays it; on any other button it is that button's own click
      const sizeButton = tag === "BUTTON" && target?.closest("[data-bet-sizer]") !== null;
      if (!key || (tag === "BUTTON" && key === "enter" && !sizeButton) || (typing && !(inAmount && key === "enter"))) return;
      const run = latest.current[key];
      if (run) {
        e.preventDefault();
        run();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active]);
}
