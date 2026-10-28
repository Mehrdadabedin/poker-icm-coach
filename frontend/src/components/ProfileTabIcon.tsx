import { useEffect, useState } from "react";
import { getUsername } from "../services/api";
import { getMyPortrait } from "../services/portraitApi";
import { getProfile } from "../services/profileApi";
import { useT } from "../i18n/I18n";

interface Who {
  hasProfile: boolean;
  name: string;
  photo: string | null;
}

/** The Profile tab's icon (plan 099): a small circle with the approved photo, else the
 * initial of the display name. A gold dot says the profile form is still empty. */
export function ProfileTabIcon({ refreshKey }: { refreshKey: unknown }) {
  const t = useT();
  const [who, setWho] = useState<Who | null>(null);
  useEffect(() => {
    let cancelled = false;
    Promise.all([getProfile().catch(() => undefined), getMyPortrait().catch(() => null)]).then(([profile, portrait]) => {
      if (cancelled || profile === undefined) return;
      setWho({
        hasProfile: profile !== null,
        name: profile?.displayName || getUsername() || "?",
        photo: portrait?.status === "approved" ? portrait.image : null,
      });
    });
    return () => { cancelled = true; };
  }, [refreshKey]);

  return (
    <span className="tab-avatar" data-testid="tab-avatar">
      {who?.photo
        ? <img src={who.photo} alt="" draggable={false} />
        : <span aria-hidden="true">{(who?.name ?? getUsername() ?? "?").charAt(0).toUpperCase()}</span>}
      {who && !who.hasProfile && <i className="tab-dot" data-testid="tab-profile-dot" role="img" aria-label={t("tabs.profileDot")} />}
    </span>
  );
}
