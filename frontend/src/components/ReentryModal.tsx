/* Re-entry / elimination notice (A39/A44): centered modal inside the poker
 * table area. Levels 1-5 add CONTINUE TOURNAMENT (re-entry); after Level 5 it
 * shows the finishing place. Either way the hero can WATCH TO THE END (BOT
 * auto-finish) or END GAME, which shows the final standings by chips; START
 * NEW GAME is on that list, not here (the owner: one of the two, plan 092). */
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
  return (
    <div className="reentry-modal" data-testid="reentry-modal" role="alert">
      {available ? (
        <>
          <b className="reentry-title">YOU LOST THE ALL-IN</b>
          <p>Your tournament stack is 0.</p>
          <p>Re-entry is still available.</p>
        </>
      ) : (
        <>
          <b className="reentry-title" data-testid="reentry-finished-title">
            YOU FINISHED {finishPlace ?? "?"} OF 9
          </b>
          <p>Level 5 has passed. Re-entry is no longer available.</p>
        </>
      )}
      <p>END GAME shows the final standings by chips.</p>
      <div className="reentry-actions">
        {available && (
          <button type="button" className="btn btn-small btn-primary" onClick={onContinue} data-testid="reentry-continue">
            CONTINUE TOURNAMENT
          </button>
        )}
        <button type="button" className="btn btn-small" onClick={onWatch} data-testid="reentry-watch">
          WATCH TO THE END
        </button>
        <button type="button" className={available ? "btn btn-small" : "btn btn-small btn-primary"} onClick={onEnd}
          data-testid="reentry-end">
          END GAME
        </button>
      </div>
    </div>
  );
}
