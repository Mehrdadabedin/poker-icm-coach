import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  getAnalyticsConsent,
  isGoogleAnalyticsConfigured,
  setAnalyticsConsent,
} from "../analytics";

export function AnalyticsConsentBanner() {
  const { pathname } = useLocation();
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
    <aside className="analytics-consent" aria-label="Analytics consent">
      <div className="analytics-consent__copy">
        <h2 className="analytics-consent__title">Your privacy matters</h2>
        <p>
          We use Google Analytics cookies to understand how visitors use
          ICMBOT. Analytics stays off unless you accept. You can change your
          choice any time with Cookie settings at the bottom of the home page.
        </p>
      </div>
      <div className="analytics-consent__actions">
        <button
          className="analytics-consent__button analytics-consent__button--reject"
          type="button"
          onClick={() => chooseConsent("denied")}
        >
          Reject analytics
        </button>
        <button
          className="analytics-consent__button analytics-consent__button--accept"
          type="button"
          onClick={() => chooseConsent("granted")}
        >
          Accept analytics
        </button>
      </div>
    </aside>
  );
}
