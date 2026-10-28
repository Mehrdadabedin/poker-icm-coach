import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { AccountPanel } from "../components/AccountPanel";
import { Copyright } from "../components/Copyright";
import { PageHeader } from "../components/PageHeader";
import { useTabBarShown } from "../hooks/useTabBarShown";
import { PortraitPanel } from "../components/PortraitPanel";
import { UpgradeCard } from "../components/UpgradeCard";
import { ProfileForm } from "../components/ProfileForm";
import { useT } from "../i18n/I18n";
import { getToken, getUsername } from "../services/api";
import { getAccount, getProfile, type Account, type Profile } from "../services/profileApi";

const greetingFor = (profile: Profile) =>
  profile.gender === "woman" || profile.gender === "man" ? profile.gender : "other";

/** YOUR PROFILE (plan 095): the photo from plan 094, personal details and the
 * account section, on one page. Signed-out visitors go to sign in. */
export function ProfilePage() {
  const t = useT();
  const tabBarShown = useTabBarShown();
  // read once: a visitor who arrives signed out goes to sign in; ending the session here goes home
  const [signedIn] = useState(() => Boolean(getToken()));
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const [account, setAccount] = useState<Account | null>(null);

  useEffect(() => {
    if (!signedIn) return;
    getProfile().then(setProfile).catch(() => setProfile(null));
    getAccount().then(setAccount).catch(() => undefined);
  }, [signedIn]);

  if (!signedIn) return <Navigate to="/login" replace />;
  const name = profile?.firstName || getUsername() || "";
  return (
    <div className="page profile-page" data-testid="profile-page">
      <PageHeader hideHome={tabBarShown} />
      <h1 className="screen-title" data-testid="profile-greeting">
        {profile ? t(`profile.greeting.${greetingFor(profile)}`, { name }) : t("profile.title")}
      </h1>
      <div className="profile-upgrade"><UpgradeCard /></div>
      <div className="profile-layout">
        <div className="profile-side">
          <PortraitPanel />
          <p className="profile-table-note">{t("profile.tableNote")}</p>
        </div>
        <div className="profile-main">
          {profile === undefined
            ? <p className="note">{t("profile.loading")}</p>
            : <ProfileForm initial={profile} onSaved={setProfile} />}
          <AccountPanel account={account} />
        </div>
      </div>
      <Copyright />
    </div>
  );
}
