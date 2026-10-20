import { googleSignInUrl, type AuthProviders } from "../services/api";
import { startAppGoogle } from "../services/appGoogle";
import { inAndroidApp } from "../services/platform";
import { ArrowRightIcon, GoogleIcon } from "./AuthIcons";
import { useT } from "../i18n/I18n";

interface ProviderButtonsProps {
  providers: AuthProviders | null;
  onNotice: (message: string) => void;
}

/** The Google pill and the "or" rule that separates it from the credential
 * fields. Phone and Apple are not offered on this screen. Google runs no flow
 * in the browser itself, so the click either leaves for the backend flow or
 * shows the notice. */
export function ProviderButtons({ providers, onNotice }: ProviderButtonsProps) {
  const googleAvailable = providers?.google === true;
  const t = useT();

  const chooseGoogle = () => {
    if (googleAvailable) {
      if (inAndroidApp()) {
        // Google blocks its sign-in in app web views: a Chrome tab runs it (plan 088)
        void startAppGoogle();
        return;
      }
      // Server-side flow: the backend holds the client secret and returns the
      // browser to /#/auth/callback with the session token.
      window.location.href = googleSignInUrl();
      return;
    }
    // Google is advertised but cannot sign anyone in, so the notice goes
    // through the same red status line as a rejected password.
    onNotice(t("auth.googleUnavailable"));
  };

  return (
    <>
      <div className="auth-providers">
        <button
          type="button"
          className="auth-provider auth-provider-light"
          onClick={chooseGoogle}
          data-testid="provider-google"
        >
          <span className="auth-provider-mark">
            <GoogleIcon />
          </span>
          <span className="auth-provider-label">{t("auth.google")}</span>
          <span className="auth-provider-end">
            <ArrowRightIcon />
          </span>
        </button>
      </div>
      <div className="auth-or">{t("auth.or")}</div>
    </>
  );
}
