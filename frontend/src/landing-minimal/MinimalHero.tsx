import { Link } from "react-router-dom";
import { useI18n } from "../i18n/I18n";
import { HeroPictures } from "./HeroPictures";

interface MinimalHeroProps {
  demoOpen: boolean;
  onWatchDemo: () => void;
}

/** Hero of the minimal landing: a very large headline, one sentence, ONE
 * primary button and a rounded outline button that opens the demo video, then the
 * pictures of the app, taking turns. */
export function MinimalHero({ demoOpen, onWatchDemo }: MinimalHeroProps) {
  const { t } = useI18n();
  return (
    <section className="lm-hero" aria-labelledby="lm-hero-title" data-testid="minimal-hero">
      <h1 className="lm-title" id="lm-hero-title">
        {t("landing.hero.before")}<span className="lm-accent">{t("landing.hero.accent")}</span>{t("landing.hero.after")}
      </h1>
      <p className="lm-sub">{t("landing.hero.sub")}</p>
      <div className="lm-actions">
        <Link className="lm-btn lm-btn-primary" to="/login" data-testid="minimal-start">
          {t("landing.startTraining")}
        </Link>
        <button
          type="button"
          className="lm-btn lm-btn-outline"
          aria-expanded={demoOpen}
          onClick={onWatchDemo}
          data-testid="minimal-watch-demo"
        >
          {t("landing.watchDemo")}
        </button>
      </div>
      <p className="lm-tagline" data-testid="minimal-tagline">{t("landing.tagline")}</p>
      <HeroPictures />
    </section>
  );
}
