import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useT } from "../i18n/I18n";
import {
  getAnalyticsConsent,
  isGoogleAnalyticsConfigured,
  setAnalyticsConsent,
} from "../analytics";

export function AnalyticsConsentBanner() {
  const { pathname } = useLocation();
  const t = useT();
  const [consent, setConsent] = useState(getAnalyticsConsent);
  const [isEditing, setIsEditing] = useState(consent === null);

  // A47: the landing footers' "Cookie settings" opens this same consent
  // editor through a window event. Once a choice is saved nothing floats on
  // the page; those footer links are the way back to the choice.
  useEffect(() => {
    const openSettings = () => setIsEditing(true);
    window.addEventListener("icmbot:cookie-settings", openSettings);
    return () => window.removeEventListener("icmbot:cookie-settings", openSettings);
  }, []);

  if (!isGoogleAnalyticsConfigured() || !isEditing) return null;

  function chooseConsent(choice: "granted" | "denied") {
    setAnalyticsConsent(choice, pathname);
    setConsent(choice);
    setIsEditing(false);
  }

  return (
    <aside className="analytics-consent" aria-label={t("consent.label")}>
      <div className="analytics-consent__copy">
        <h2 className="analytics-consent__title">{t("consent.title")}</h2>
        <p>{t("consent.text")}</p>
      </div>
      <div className="analytics-consent__actions">
        <button
          className="analytics-consent__button analytics-consent__button--reject"
          type="button"
          onClick={() => chooseConsent("denied")}
        >
          {t("consent.reject")}
        </button>
        <button
          className="analytics-consent__button analytics-consent__button--accept"
          type="button"
          onClick={() => chooseConsent("granted")}
        >
          {t("consent.accept")}
        </button>
      </div>
    </aside>
  );
}
