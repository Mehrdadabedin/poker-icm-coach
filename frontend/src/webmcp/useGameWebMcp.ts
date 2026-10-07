import { useEffect, useRef } from "react";
import type { GameToolActions } from "./registerGameTools";
import { registerGameTools } from "./registerGameTools";

export interface GameWebMcpBindings extends GameToolActions {
  enabled: boolean;
  stateAvailable: boolean;
}

export function useGameWebMcp(bindings: GameWebMcpBindings): void {
  const latest = useRef(bindings);
  latest.current = bindings;
  const { enabled, stateAvailable, tableId } = bindings;

  useEffect(() => {
    if (!enabled || !stateAvailable) return;
    let disposed = false;
    let retryTimer: number | undefined;
    let registrationCleanup: (() => void) | undefined;
    const actions: GameToolActions = {
      tableId,
      getState: () => latest.current.getState(),
      isPaused: () => latest.current.isPaused(),
      countdown: () => latest.current.countdown(),
      isReviewOpen: () => latest.current.isReviewOpen(),
      act: (kind, amount) => latest.current.act(kind, amount),
      nextHand: () => latest.current.nextHand(),
      startNewHand: () => latest.current.startNewHand(),
      getHandHistory: () => latest.current.getHandHistory(),
      pause: () => latest.current.pause(),
      resume: () => latest.current.resume(),
      showHandResult: () => latest.current.showHandResult(),
    };
    const attemptRegistration = () => {
      if (disposed) return;
      const registration = registerGameTools(actions);
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
  }, [enabled, stateAvailable, tableId]);
}
