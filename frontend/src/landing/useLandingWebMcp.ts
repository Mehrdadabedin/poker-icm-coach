/**
 * A47 — hooks the landing-page WebMCP tools to page actions. Mirrors
 * useGameWebMcp: retries until document.modelContext appears and cleans the
 * registration up on unmount.
 */
import { useEffect, useRef } from "react";
import type { LandingToolActions } from "./landingTools";
import { registerLandingTools } from "./registerLandingTools";

export function useLandingWebMcp(actions: LandingToolActions, enabled = true): void {
  const latest = useRef(actions);
  latest.current = actions;

  useEffect(() => {
    if (!enabled) return;
    let disposed = false;
    let retryTimer: number | undefined;
    let registrationCleanup: (() => void) | undefined;
    const currentActions: LandingToolActions = {
      watchDemo: () => latest.current.watchDemo(),
      startTraining: () => latest.current.startTraining(),
    };
    const attemptRegistration = () => {
      if (disposed) return;
      const registration = registerLandingTools(currentActions);
      if (!registration) {
        retryTimer = window.setTimeout(attemptRegistration, 250);
        return;
      }
      if (retryTimer !== undefined) window.clearTimeout(retryTimer);
      registrationCleanup = registration.cleanup;
      void registration.ready;
    };

    attemptRegistration();
    return () => {
      disposed = true;
      if (retryTimer !== undefined) window.clearTimeout(retryTimer);
      registrationCleanup?.();
    };
  }, [enabled]);
}
