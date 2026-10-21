/* Plan 094: a one-time card on the bot lineup page, where the player sees the
 * bots' faces just before sitting down. It never blocks play: Not now hides it
 * for that account, and each new review result shows once. */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useT } from "../i18n/I18n";
import { getUsername } from "../services/api";
import { getMyPortrait, type MyPortrait } from "../services/portraitApi";

const seenKey = () => `icmbot.portraitPrompt.${getUsername() ?? ""}`;

/** One state of one photo: a new upload or a new review result shows again. */
const fingerprint = (p: MyPortrait) => (p.image ? `${p.status}:${p.image.slice(-32)}` : p.status);

function seen(): string | null {
  try {
    return localStorage.getItem(seenKey());
  } catch {
    return null;
  }
}

function markSeen(value: string): void {
  try {
    localStorage.setItem(seenKey(), value);
  } catch {
    // private windows may refuse storage; the card then shows again next visit
  }
}

export function PortraitPrompt() {
  const t = useT();
  const navigate = useNavigate();
  const [portrait, setPortrait] = useState<MyPortrait | null>(null);

  useEffect(() => {
    let live = true;
    getMyPortrait({ fresh: true }).then((p) => { if (live) setPortrait(p); }).catch(() => undefined);
    return () => { live = false; };
  }, []);

  if (!portrait || portrait.status === "approved" || seen() === fingerprint(portrait)) return null;
  const status = portrait.status;
  const dismiss = () => {
    markSeen(fingerprint(portrait));
    setPortrait({ ...portrait }); // render again, now hidden
  };

  return (
    <aside className={`portrait-prompt portrait-prompt-${status}`} data-testid="portrait-prompt">
      <span className="portrait-prompt-icon" aria-hidden="true">{(getUsername() ?? "?").charAt(0).toUpperCase()}</span>
      <div className="portrait-prompt-body">
        <b className="portrait-prompt-title">{t(`portraitPrompt.${status}.title`)}</b>
        <p className="portrait-prompt-text">{t(`portraitPrompt.${status}.text`)}</p>
        <div className="portrait-prompt-actions">
          {status !== "pending" && (
            <button type="button" className="portrait-prompt-go" onClick={() => navigate("/portrait")}
              data-testid="portrait-prompt-add">
              {t(status === "none" ? "portraitPrompt.add" : "portraitPrompt.choose")}
            </button>
          )}
          <button type="button" className="portrait-prompt-later" onClick={dismiss} data-testid="portrait-prompt-later">
            {t(status === "none" ? "portraitPrompt.later" : "portraitPrompt.ok")}
          </button>
        </div>
      </div>
    </aside>
  );
}
