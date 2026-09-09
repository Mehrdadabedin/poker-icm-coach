/* A18/Phase 7 — reusable button/result label preferences.

Single mechanism driving whether action buttons (FOLD / CHECK / CALL / BET /
RAISE / ALL-IN) and result labels (YOU WON / YOU LOST / CHOPPED) show their
text labels. Values come from the existing /api/settings preferences
architecture (showActionLabels / showResultLabels) and are cached in-memory so
all components share one source of truth. Each component that honors the
preference keeps the control functional and accessible (aria-label/title) even
when the label is hidden.
*/
import { useEffect, useState } from "react";
import { request } from "./api";

export interface LabelPreferences {
  actionLabels: boolean;
  resultLabels: boolean;
}

const DEFAULTS: LabelPreferences = { actionLabels: true, resultLabels: true };

type SettingsPayload = {
  startingStack: number;
  startingSmallBlind: number;
  startingBigBlind: number;
  blindLevelMinutes: number;
  fastMode: boolean;
  showActionLabels: boolean;
  showResultLabels: boolean;
};

let cached: LabelPreferences | null = null;
let inflight: Promise<LabelPreferences> | null = null;

export function loadLabelPreferences(force = false): Promise<LabelPreferences> {
  if (cached !== null && !force) return Promise.resolve(cached);
  if (inflight === null) {
    inflight = request<SettingsPayload>("/api/settings")
      .then((s) => {
        cached = {
          actionLabels: s.showActionLabels !== false,
          resultLabels: s.showResultLabels !== false,
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

/** Reactive accessor for components; single cached source of truth. */
export function useLabelPreferences(): LabelPreferences {
  const [prefs, setPrefs] = useState<LabelPreferences>(DEFAULTS);
  useEffect(() => {
    void loadLabelPreferences().then(setPrefs);
  }, []);
  return prefs;
}
