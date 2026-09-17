import { googleSignInUrl, type AuthProviders } from "../services/api";
import { ArrowRightIcon, GoogleIcon } from "./AuthIcons";

type ProviderKind = "phone" | "google" | "apple";

/** Copy for a provider the backend has no flow for. Phone and Apple have no
 * pill on the sign-in screen any more, so those two branches are kept for the
 * flows rather than rendered today. The Google clause is only offered when the
 * providers endpoint reports Google as configured, so the notice never points
 * at a control that would fail. */
function providerNotice(kind: ProviderKind, googleAvailable: boolean): string {
  const googleClause = googleAvailable ? " or continue with Google" : "";
  if (kind === "phone") {
    return (
      "Phone sign-in isn't available yet. SMS verification requires additional " +
      "service configuration. For now, you can create an account with Sign up" +
      googleClause +
      "."
    );
  }
  if (kind === "apple") {
    return (
      "Apple sign-in isn't available yet. For now, you can create an account " +
      "with Sign up" +
      googleClause +
      "."
    );
  }
  return (
    "Google sign-in isn't available yet. For now, you can sign in with your " +
    "username and password."
  );
}

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

  const chooseGoogle = () => {
    if (googleAvailable) {
      // Server-side flow: the backend holds the client secret and returns the
      // browser to /#/auth/callback with the session token.
      window.location.href = googleSignInUrl();
      return;
    }
    // Google is advertised but cannot sign anyone in, so the notice goes
    // through the same red status line as a rejected password.
    onNotice(providerNotice("google", googleAvailable));
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
          <span className="auth-provider-label">Continue with Google</span>
          <span className="auth-provider-end">
            <ArrowRightIcon />
          </span>
        </button>
      </div>
      <div className="auth-or">or</div>
    </>
  );
}
