import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { clearAuth, getToken, getUsername, logout, me } from "../services/api";
import { useIsAdmin } from "../hooks/useIsAdmin";
import { useIsPhone } from "../hooks/useIsPhone";
import { Copyright } from "../components/Copyright";
import { BrandLogo } from "../components/BrandLogo";
import { HomeBand } from "../components/HomeBand";
import { HomeMenu } from "../components/HomeMenu";
import { LanguageMenu } from "../components/LanguageMenu";
import { LoginForm } from "../components/LoginForm";
import { useT } from "../i18n/I18n";

/** HOME screen: username login (A03) then start a practice tournament or
 * visit the tools. The authenticated username replaces "Hero" everywhere. */
export function HomePage() {
  const location = useLocation();
  const t = useT();
  const authNotice = (location.state as { authNotice?: string } | null)?.authNotice ?? null;
  const [user, setUser] = useState<string | null>(() => (getToken() ? getUsername() : null));
  const isAdmin = useIsAdmin();
  const phone = useIsPhone();

  useEffect(() => {
    if (!getToken()) return;
    me()
      .then((who) => {
        if (who.username) setUser(who.username);
      })
      .catch(() => {
        clearAuth();
        setUser(null);
      });
  }, []);

  const signOut = async () => {
    try {
      await logout();
    } catch {
      // token may already be revoked server-side; always clear locally
    }
    clearAuth();
    setUser(null);
  };

  if (!user) {
    // The sign-in screen owns the full viewport: brand header, then the panel.
    return (
      <div className="page home-page auth-page" data-testid="home-page">
        <div className="auth-shell">
          <header className="auth-brand">
            {/* A23: the centred sign-in brand is the shared logo mark, so the
                screen shows the same artwork as every other header. The heading
                keeps its accessible name through the mark's hidden text. */}
            <h1 className="auth-brand-logo" data-testid="app-title"><BrandLogo /></h1>
            <span className="auth-title-rule" aria-hidden="true" />
          </header>
          {authNotice && (
            <p className="auth-notice" role="alert" data-testid="auth-session-notice">
              {authNotice}
            </p>
          )}
          <LoginForm onLogin={setUser} />
          <LanguageMenu />
          <Copyright />
        </div>
      </div>
    );
  }

  // Plan 066: a white page under a black top bar; the logo's white letters
  // need the dark band.
  return (
    <div className="home-screen" data-testid="home-page">
      <HomeBand user={user} onSignOut={() => void signOut()} />
      <main className="home-body">
        <p className="home-tagline">{t("home.tagline")}</p>
        <HomeMenu isAdmin={isAdmin} phone={phone} />
        <Copyright />
      </main>
    </div>
  );
}