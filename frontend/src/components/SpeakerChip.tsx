import { useEffect } from "react";
import { useT } from "../i18n/I18n";
import { numberLocale } from "../i18n/lang";
import { usePlan } from "../services/plan";
import { speak, speechAvailable, stopSpeaking } from "../services/speech";

const WAVES = <path d="M15.5 8.5a5 5 0 0 1 0 7M18 6a8.5 8.5 0 0 1 0 12" />;
const CROSS = <path d="M16 9.5l5 5M21 9.5l-5 5" />;

/** The coach's voice switch (plan 112), the first round chip on the status line. Pro only,
 * and only where the device can speak. The name stays the same: `aria-pressed` holds the state. */
export function SpeakerChip({ on, onChange }: { on: boolean; onChange: (on: boolean) => void }) {
  const t = useT();
  const { pro, known } = usePlan();

  // iOS speaks only after a tap that said something. A saved "on" after a reload has had no
  // such tap, so the first touch on the page says an empty sentence once.
  useEffect(() => {
    if (!on || !speechAvailable()) return undefined;
    const unlock = () => speak("", numberLocale(), true);
    document.addEventListener("pointerdown", unlock, { once: true });
    return () => document.removeEventListener("pointerdown", unlock);
  }, [on]);

  if (!known || !pro || !speechAvailable()) return null;
  const toggle = () => {
    onChange(!on);
    if (on) stopSpeaking();
    else speak(t("speak.on"), numberLocale());
  };
  return (
    <button type="button" className="tbl-chip tbl-chip-speak" aria-label={t("speak.chip")} aria-pressed={on}
      title={t(on ? "speak.titleOn" : "speak.titleOff")} onClick={toggle} data-testid="speaker-chip">
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
        {on ? WAVES : CROSS}
      </svg>
    </button>
  );
}
