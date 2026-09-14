import { googleSignInUrl, type AuthProviders } from "../services/api";
import type { NoticeTone } from "./AuthMessages";
import { AppleIcon, ArrowRightIcon, GoogleIcon, PhoneIcon } from "./AuthIcons";

type ProviderKind = "phone" | "google" | "apple";

/** Copy for a provider the backend has no flow for. The Google clause is only
 * offered when the providers endpoint reports Google as configured, so the
 * notice never points at a control that would fail. */
export function providerNotice(kind: ProviderKind, googleAvailable: boolean): string {
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
  onNotice: (message: string, tone: NoticeTone) => void;
}

/** The three provider pills plus the "or" rule that separates them from the
 * credential fields. Phone and Apple have no backend flow yet, so their click
 * shows a notice instead of sending the browser anywhere. */
export function ProviderButtons({ providers, onNotice }: ProviderButtonsProps) {
  const googleAvailable = providers?.google === true;

  const choose = (kind: ProviderKind) => {
    if (kind === "google" && googleAvailable) {
      // Server-side flow: the backend holds the client secret and returns the
      // browser to /#/auth/callback with the session token.
      window.location.href = googleSignInUrl();
      return;
    }
    // Google is a configured provider whose sign-in is missing, so its notice
    // is an error message; Apple and phone are simply not offered yet.
    onNotice(providerNotice(kind, googleAvailable), kind === "google" ? "error" : "status");
  };

  return (
    <>
      <div className="auth-providers">
        <button
          type="button"
          className="auth-provider auth-provider-dark"
          onClick={() => choose("phone")}
          data-testid="provider-phone"
        >
          <span className="auth-provider-mark">
            <PhoneIcon />
          </span>
          <span className="auth-provider-label">Continue with phone</span>
          <span className="auth-provider-end">
            <ArrowRightIcon />
          </span>
        </button>
        <button
          type="button"
          className="auth-provider auth-provider-light"
          onClick={() => choose("google")}
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
        <button
          type="button"
          className="auth-provider auth-provider-light"
          onClick={() => choose("apple")}
          data-testid="provider-apple"
        >
          <span className="auth-provider-mark">
            <AppleIcon />
          </span>
          <span className="auth-provider-label">Continue with Apple</span>
          <span className="auth-provider-end">
            <ArrowRightIcon />
          </span>
        </button>
      </div>
      <div className="auth-or">or</div>
    </>
  );
}
