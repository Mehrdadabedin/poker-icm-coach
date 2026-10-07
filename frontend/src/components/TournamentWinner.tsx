/* Tournament champion screen (A45): covers the whole table area once the
 * tournament ends. The plaque text and the finish strip are positioned in
 * percentages of the artwork (1671 x 941), see winner.css. */

const ORDINAL_SUFFIX: Record<number, string> = { 1: "ST", 2: "ND", 3: "RD" };

/** 1 -> 1ST, 2 -> 2ND, 3 -> 3RD, 4 -> 4TH, 11 -> 11TH, 22 -> 22ND. */
export function ordinal(n: number): string {
  const teen = n % 100 >= 11 && n % 100 <= 13;
  return `${n}${teen ? "TH" : (ORDINAL_SUFFIX[n % 10] ?? "TH")}`;
}

export function TournamentWinner({ username, place, heroIsChampion, onNewSession }: {
  username: string;
  place?: number | null;
  heroIsChampion: boolean;
  onNewSession?: () => void;
}) {
  const display = username?.trim() || "Champion";
  return (
    <div className="tournament-winner" data-testid="tournament-winner" role="dialog" aria-label="Tournament finished">
      <div className="tournament-winner-panel">
        <div className="tournament-winner-art" data-testid="tournament-winner-art">
          <img
            src="/images/tournament-champion.png"
            alt="Tournament Champion"
            className="tournament-winner-image"
            data-testid="tournament-winner-image"
            draggable={false}
          />
          <div className="tournament-winner-plaque" data-testid="tournament-winner-plaque">
            <div className="tournament-winner-title" data-testid="tournament-winner-title">
              CONGRATULATIONS
            </div>
            <span className="tournament-winner-divider" aria-hidden="true" />
            <div
              className="tournament-winner-name"
              data-testid="tournament-winner-name"
              style={{ "--name-chars": Math.min(Math.max(display.length, 6), 24) } as React.CSSProperties}
            >
              {display}
            </div>
          </div>
          {!heroIsChampion && (
            <div className="tournament-winner-place" data-testid="tournament-winner-place">
              YOU FINISHED {place ? ordinal(place) : "?"} OF 9
            </div>
          )}
        </div>
        {onNewSession && (
          <button
            type="button"
            className="btn btn-primary tournament-winner-new"
            data-testid="tournament-new-session"
            onClick={onNewSession}
          >
            START NEW SESSION
          </button>
        )}
      </div>
    </div>
  );
}
