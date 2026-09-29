/** A26 — BOT PROFILES screen: pick one of four predefined human-style
 * personalities. The selection is stored locally and applied to BOT decisions
 * when the next table is created. */
import { useState } from "react";
import { Copyright } from "../components/Copyright";
import { HomeButton } from "../components/HomeButton";
import {
  BOT_PROFILES,
  getSelectedProfileId,
  setSelectedProfileId,
} from "../models/botProfiles";

export function BotProfilesPage() {
  const [selectedId, setSelectedId] = useState<string | null>(() => getSelectedProfileId());

  const choose = (id: string) => {
    setSelectedProfileId(id);
    setSelectedId(id);
  };

  const selected = BOT_PROFILES.find((p) => p.id === selectedId) ?? null;

  return (
    <div className="page bot-profiles-page" data-testid="bot-profiles-page">
      <h1 className="screen-title">BOT PROFILES</h1>
      <p className="bot-profiles-intro">
        Choose the personality your opponent bots play with. The selection is
        applied the next time you start a table.
      </p>
      <div className="bot-profiles-grid">
        {BOT_PROFILES.map((profile) => {
          const active = profile.id === selectedId;
          return (
            <button
              key={profile.id}
              type="button"
              className={active ? "bot-profile-card selected" : "bot-profile-card"}
              onClick={() => choose(profile.id)}
              aria-pressed={active}
              data-testid={`bot-profile-${profile.id}`}
            >
              <span
                className="bot-avatar"
                style={{ backgroundColor: profile.avatar.color }}
                aria-hidden="true"
              >
                {profile.avatar.initials}
              </span>
              <b className="bot-profile-name">{profile.name}</b>
              <span className="bot-profile-style">{profile.style}</span>
              <span className="bot-profile-desc">{profile.description}</span>
              <span className="bot-profile-selected" aria-hidden={!active}>
                {active ? "SELECTED" : "SELECT"}
              </span>
            </button>
          );
        })}
      </div>
      <p className="bot-profiles-current" data-testid="bot-profiles-current" aria-live="polite">
        {selected
          ? `SELECTED: ${selected.name} · ${selected.style}`
          : "No profile selected yet — the default personality will be used."}
      </p>
      <HomeButton />
      <Copyright />
    </div>
  );
}
