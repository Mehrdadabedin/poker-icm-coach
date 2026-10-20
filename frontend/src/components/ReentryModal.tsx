/* Re-entry / elimination notice (A39/A44): centered modal inside the poker
 * table area. Levels 1-5 add CONTINUE TOURNAMENT (re-entry); after Level 5 it
 * shows the finishing place. Either way the hero can WATCH TO THE END (BOT
 * auto-finish) or END GAME, which shows the final standings by chips; START
 * NEW GAME is on that list, not here (the owner: one of the two, plan 092). */
import { useI18n } from "../i18n/I18n";
import { placeOrdinal } from "../i18n/lang";

export function ReentryModal({
  available,
  finishPlace,
  onContinue,
  onWatch,
  onEnd,
}: {
  available: boolean;
  finishPlace?: number | null;
  onContinue?: () => void;
  onWatch?: () => void;
  onEnd?: () => void;
}) {
  const { lang, t } = useI18n();
  return (
    <div className="reentry-modal" data-testid="reentry-modal" role="alert">
      {available ? (
        <>
          <b className="reentry-title">{t("bust.title")}</b>
          <p>{t("bust.stack")}</p>
          <p>{t("bust.reentry")}</p>
        </>
      ) : (
        <>
          <b className="reentry-title" data-testid="reentry-finished-title">
            {t("bust.finished", { place: finishPlace ? placeOrdinal(lang, finishPlace) : "?" })}
          </b>
          <p>{t("bust.closed")}</p>
        </>
      )}
      <p>{t("bust.endHint", { end: t("bust.end") })}</p>
      <div className="reentry-actions">
        {available && (
          <button type="button" className="btn btn-small btn-primary" onClick={onContinue} data-testid="reentry-continue">
            {t("bust.continue")}
          </button>
        )}
        <button type="button" className="btn btn-small" onClick={onWatch} data-testid="reentry-watch">
          {t("bust.watch")}
        </button>
        <button type="button" className={available ? "btn btn-small" : "btn btn-small btn-primary"} onClick={onEnd}
          data-testid="reentry-end">
          {t("bust.end")}
        </button>
      </div>
    </div>
  );
}
