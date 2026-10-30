import { useEffect, useState } from "react";
import { useI18n } from "../i18n/I18n";

/** How long each hero picture stays on screen (the owner, 30 Oct). */
export const HERO_ROTATE_MS = 5000;

/** The hero's two pictures, taking turns with a soft fade: the real app on a laptop
 * and a phone, and the app on a glowing screen. Stays on the first with reduced
 * motion; jsdom has no matchMedia, so that check is guarded. */
export function HeroPictures() {
  const { t, lang } = useI18n();
  const [showing, setShowing] = useState(0);
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return undefined;
    const timer = window.setInterval(() => setShowing((n) => (n + 1) % 2), HERO_ROTATE_MS);
    return () => window.clearInterval(timer);
  }, []);
  return (
    <div className="lm-hero-img lm-hero-pictures">
      <img
        className={showing === 0 ? "is-on" : undefined}
        src={lang === "es" ? "/images/hero-app-es.webp" : "/images/hero-app.webp"}
        alt={t("landing.hero.alt")}
        aria-hidden={showing !== 0}
        width={1602}
        height={982}
        data-testid="minimal-hero-visual"
      />
      <img
        className={showing === 1 ? "is-on" : undefined}
        src="/images/hero-glow.webp"
        alt={t("landing.hero.altGlow")}
        aria-hidden={showing !== 1}
        width={884}
        height={543}
        data-testid="minimal-hero-glow"
      />
    </div>
  );
}
