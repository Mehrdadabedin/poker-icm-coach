import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Copyright } from "../components/Copyright";
import { PageHeader } from "../components/PageHeader";
import { useT } from "../i18n/I18n";
import { getUsername } from "../services/api";
import { getMyPortrait, removePortrait, uploadPortrait, type MyPortrait } from "../services/portraitApi";
import { ACCEPTED, resizePortrait } from "../services/resizePortrait";

/** YOUR PORTRAIT (plan 094): the photo on the player's seat, shown once an Admin approves it. */
export function PortraitPage() {
  const t = useT();
  const input = useRef<HTMLInputElement>(null);
  const [portrait, setPortrait] = useState<MyPortrait | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    getMyPortrait({ fresh: true }).then(setPortrait).catch(() => setPortrait({ status: "none", image: null }));
  }, []);

  const choose = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = ""; // choosing the same file again still fires
    if (!file) return;
    setBusy(true);
    setFailed(false);
    try {
      setPortrait(await uploadPortrait(await resizePortrait(file)));
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      setPortrait(await removePortrait());
    } finally {
      setBusy(false);
    }
  };

  const status = portrait?.status ?? "none";
  const initial = (getUsername() ?? "?").charAt(0).toUpperCase();
  return (
    <div className="page" data-testid="portrait-page">
      <PageHeader />
      <section className="portrait-card" aria-labelledby="portrait-title">
        <h1 id="portrait-title" className="portrait-title">{t("portrait.title")}</h1>
        <div className="portrait-row">
          <div className="portrait-circle" data-testid="portrait-circle">
            {portrait?.image
              ? <img src={portrait.image} alt={t("portrait.alt")} draggable={false} />
              : <span aria-hidden="true">{initial}</span>}
          </div>
          <span className={`portrait-badge portrait-badge-${status}`} data-testid="portrait-status">
            {t(`portrait.status.${status}`)}
          </span>
        </div>
        <p className="portrait-hint">{t(`portrait.hint.${status}`)}</p>
        <input ref={input} type="file" accept={ACCEPTED.join(",")} hidden onChange={(e) => void choose(e)}
          data-testid="portrait-input" />
        <button type="button" className="portrait-button" disabled={busy || !portrait}
          onClick={() => input.current?.click()} data-testid="portrait-choose">
          {busy ? t("portrait.uploading") : t(portrait?.image ? "portrait.change" : "portrait.choose")}
        </button>
        {portrait?.image && (
          <button type="button" className="portrait-remove" disabled={busy} onClick={() => void remove()}
            data-testid="portrait-remove">
            {t("portrait.remove")}
          </button>
        )}
        {failed && <p className="portrait-error" role="alert">{t("portrait.error")}</p>}
        <p className="portrait-note">{t("portrait.note")}</p>
      </section>
      <Copyright />
    </div>
  );
}
