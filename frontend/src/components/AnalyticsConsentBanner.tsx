import { useState } from "react";
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

  if (!isGoogleAnalyticsConfigured()) return null;

  function chooseConsent(choice: "granted" | "denied") {
    setAnalyticsConsent(choice, pathname);
    setConsent(choice);
    setIsEditing(false);
  }

  return (
    <>
      {isEditing ? (
        <aside className="analytics-consent" aria-label="Analytics consent">
          <div className="analytics-consent__copy">
            <h2 className="analytics-consent__title">Your privacy matters</h2>
            <p>
              We use Google Analytics cookies to understand how visitors use
              ICMBOT. Analytics stays off unless you accept. You can change
              your choice in Cookie settings.
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
      ) : (
        <button
          className="analytics-cookie-settings"
          type="button"
          onClick={() => setIsEditing(true)}
        >
          Cookie settings
        </button>
      )}
    </>
  );
}
