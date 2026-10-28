import { useState } from "react";
import { CHOICES, getThemeChoice, setThemeChoice, type ThemeChoice } from "../services/theme";
import { useT } from "../i18n/I18n";
import type { MessageKey } from "../i18n/messages/en";

const LABEL: Record<ThemeChoice, MessageKey> = { dark: "theme.dark", light: "theme.light", system: "theme.system" };

const ICON: Record<ThemeChoice, JSX.Element> = {
  dark: <path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z" />,
  light: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  system: (
    <>
      <rect x="7" y="2" width="10" height="20" rx="2" />
      <path d="M11 18h2" />
    </>
  ),
};

/** APPEARANCE (plan 103): Dark, Light or Same as my phone, kept on this device.
 * On its own page the page's heading (id appearance-title) names it instead. */
export function AppearancePicker({ heading = true }: { heading?: boolean }) {
  const t = useT();
  const [choice, setChoice] = useState<ThemeChoice>(getThemeChoice);
  const pick = (next: ThemeChoice) => {
    setThemeChoice(next);
    setChoice(next);
  };
  return (
    <section className="appearance" aria-labelledby="appearance-title" data-testid="appearance-picker">
      {heading && <h3 id="appearance-title" className="appearance-title">{t("theme.title")}</h3>}
      <div className="appearance-options" role="radiogroup" aria-labelledby="appearance-title">
        {CHOICES.map((value) => (
          <button key={value} type="button" role="radio" aria-checked={choice === value}
            className={choice === value ? "appearance-option appearance-current" : "appearance-option"}
            onClick={() => pick(value)} data-testid={`theme-${value}`}>
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">{ICON[value]}</svg>
            <span>{t(LABEL[value])}</span>
          </button>
        ))}
      </div>
      <p className="appearance-note">{t("theme.note")}</p>
    </section>
  );
}
