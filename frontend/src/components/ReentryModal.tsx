/* Re-entry / elimination notice (A39): centered modal inside the poker table
 * area. Levels 1-5: the hero chose CONTINUE TOURNAMENT (re-entry) or START
 * NEW GAME; after Level 5 the notice states the tournament has ended and no
 * buttons are offered (BOT auto-finish takes over). */
export function ReentryModal({
  available,
  onContinue,
  onNewGame,
}: {
  available: boolean;
  onContinue?: () => void;
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
          <b className="reentry-title">RE-ENTRY CLOSED</b>
          <p>Level 5 has passed. Re-entry is no longer available.</p>
          <p>Your tournament has ended.</p>
        </>
      )}
    </div>
  );
}
