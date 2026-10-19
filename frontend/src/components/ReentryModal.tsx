/* Re-entry / elimination notice (A39/A44): centered modal inside the poker
 * table area. Levels 1-5 add CONTINUE TOURNAMENT (re-entry); after Level 5 it
 * shows the finishing place. Either way the hero can WATCH TO THE END (BOT
 * auto-finish), END GAME (places by chips now, plan 092) or START NEW GAME. */
export function ReentryModal({
  available,
  finishPlace,
  onContinue,
  onWatch,
  onEnd,
  onNewGame,
}: {
  available: boolean;
  finishPlace?: number | null;
  onContinue?: () => void;
  onWatch?: () => void;
  onEnd?: () => void;
  onNewGame?: () => void;
}) {
  const watchAndEnd = (
    <>
      <button type="button" className="btn btn-small" onClick={onWatch} data-testid="reentry-watch">
        WATCH TO THE END
      </button>
      <button type="button" className="btn btn-small" onClick={onEnd} data-testid="reentry-end">
        END GAME
      </button>
    </>
  );
  return (
    <div className="reentry-modal" data-testid="reentry-modal" role="alert">
      {available ? (
        <>
          <b className="reentry-title">YOU LOST THE ALL-IN</b>
          <p>Your tournament stack is 0.</p>
          <p>Re-entry is still available. END GAME places everyone by chips now.</p>
          <div className="reentry-actions">
            <button type="button" className="btn btn-small btn-primary" onClick={onContinue} data-testid="reentry-continue">
              CONTINUE TOURNAMENT
            </button>
            {watchAndEnd}
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
          <p>Watch the bots finish, or END GAME to place everyone by chips now.</p>
          <div className="reentry-actions">
            {watchAndEnd}
            <button type="button" className="btn btn-small" onClick={onNewGame} data-testid="reentry-new-game">
              START NEW GAME
            </button>
          </div>
        </>
      )}
    </div>
  );
}
