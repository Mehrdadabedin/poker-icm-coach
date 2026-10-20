import { Link } from "react-router-dom";
import { useT } from "../i18n/I18n";

/** The same single action again, for visitors who read to the end. */
export function MinimalClosing() {
  const t = useT();
  return (
    <section className="lm-closing" aria-labelledby="lm-closing-title" data-testid="minimal-closing">
      <h2 className="lm-closing-title" id="lm-closing-title">{t("landing.closing")}</h2>
      <Link className="lm-btn lm-btn-primary" to="/login" data-testid="minimal-closing-start">
        {t("landing.startTraining")}
      </Link>
    </section>
  );
}
