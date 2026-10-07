/* A18/Phase 7 — reusable display preferences.

Single mechanism driving whether action buttons (FOLD / CHECK / CALL / BET /
RAISE / ALL-IN) and result labels (YOU WON / YOU LOST / CHOPPED) show their
text labels, and which card back (blue / red) face-down cards use. Values come
from the existing /api/settings preferences architecture (showActionLabels /
showResultLabels / cardBack) and are cached in-memory so all components share
one source of truth. Each component that honors the
preference keeps the control functional and accessible (aria-label/title) even
when the label is hidden.
*/
import { useEffect, useState } from "react";
import { request } from "./api";

export type CardBack = "blue" | "red";

interface DisplayPreferences {
  actionLabels: boolean;
  resultLabels: boolean;
  cardBack: CardBack;
}

const DEFAULTS: DisplayPreferences = { actionLabels: true, resultLabels: true, cardBack: "blue" };

export type SettingsPayload = {
  startingStack: number;
  startingSmallBlind: number;
  startingBigBlind: number;
  blindLevelMinutes: number;
  fastMode: boolean;
  showActionLabels: boolean;
  showResultLabels: boolean;
  cardBack?: CardBack;
};

let cached: DisplayPreferences | null = null;
let inflight: Promise<DisplayPreferences> | null = null;

function loadDisplayPreferences(force = false): Promise<DisplayPreferences> {
  if (cached !== null && !force) return Promise.resolve(cached);
  if (inflight === null) {
    inflight = request<SettingsPayload>("/api/settings")
      .then((s) => {
        cached = {
          actionLabels: s.showActionLabels !== false,
          resultLabels: s.showResultLabels !== false,
          cardBack: s.cardBack === "red" ? "red" : "blue",
        };
        return cached;
      })
      .catch(() => ({ ...DEFAULTS }))
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

/** Called after SAVE SETTINGS: the next reader fetches the saved values
 * instead of the ones cached when the app first loaded. */
export function invalidateDisplayPreferences(): void {
  cached = null;
}

/** Reactive accessor for components; single cached source of truth. Starts
 * from the cache, so a mounted card back does not flash the default. */
export function useDisplayPreferences(): DisplayPreferences {
  const [prefs, setPrefs] = useState<DisplayPreferences>(() => cached ?? DEFAULTS);
  useEffect(() => {
    let live = true;
    void loadDisplayPreferences().then((next) => {
      if (live) setPrefs(next);
    });
    return () => {
      live = false;
    };
  }, []);
  return prefs;
}
