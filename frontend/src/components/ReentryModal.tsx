/* Re-entry / elimination notice (A39/A44): centered modal inside the poker
 * table area. Levels 1-5: the hero chooses CONTINUE TOURNAMENT (re-entry) or
 * START NEW GAME. After Level 5 the hero chose between WATCH TO THE END
 * (existing BOT auto-finish) and START NEW GAME, and sees the finishing place. */
export function ReentryModal({
  available,
  finishPlace,
  onContinue,
  onWatch,
  onNewGame,
}: {
  available: boolean;
  finishPlace?: number | null;
  onContinue?: () => void;
  onWatch?: () => void;
  onNewGame?: () => void;
}) {
  return (
    <div className="reentry-modal" data-testid="reentry-modal" role="alert">
      {available ? (
        <>
          <b className="reentry-title">YOU LOST THE ALL-IN</b>
          <p>Your tournament stack is 0.</p>
          <p>Re-entry is still available.</p>
          <div className="reentry-actions">
            <button type="button" className="btn btn-small btn-primary" onClick={onContinue} data-testid="reentry-continue">
              CONTINUE TOURNAMENT
            </button>
            <button type="button" className="btn btn-small" onClick={onNewGame} data-testid="reentry-new-game">
              START NEW GAME
            </button>
          </div>
        </>
      ) : (
        <>
          <b className="reentry-title" data-testid="reentry-finished-title">
            YOU FINISHED {finishPlace ?? "?"} OF 9
          </b>
          <p>Level 5 has passed. Re-entry is no longer available.</p>
          <p>Your tournament has ended.</p>
          <div className="reentry-actions">
            <button type="button" className="btn btn-small btn-primary" onClick={onWatch} data-testid="reentry-watch">
              WATCH TO THE END
            </button>
            <button type="button" className="btn btn-small" onClick={onNewGame} data-testid="reentry-new-game">
              START NEW GAME
            </button>
          </div>
        </>
      )}
    </div>
  );
}
