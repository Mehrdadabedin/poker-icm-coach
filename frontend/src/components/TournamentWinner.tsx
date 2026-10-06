/* Tournament winner screen (A45): the champion artwork fills the central
 * table area when the tournament ends. "Congratulations <champion name>"
 * overlays the artwork; when the hero is not the champion, the hero's
 * finishing place is shown too. No buttons, no extra text, no game logic. */
export function TournamentWinner({ username, place }: {
  username: string;
  place?: number | null;
}) {
  const display = username?.trim() || "Champion";
  const finished = place !== undefined && place !== null && place > 1;
  return (
    <div className="tournament-winner" data-testid="tournament-winner">
      <div className="tournament-winner-content">
        <img
          src="/images/tournament-champion.png"
          alt="Tournament Champion"
          className="tournament-winner-image"
          data-testid="tournament-winner-image"
          draggable={false}
        />
        <div className="tournament-winner-title" data-testid="tournament-winner-title">
          CONGRATULATIONS
        </div>
        <div className="tournament-winner-name" data-testid="tournament-winner-name">
          {display}
        </div>
        {finished && (
          <div className="tournament-winner-place" data-testid="tournament-winner-place">
            YOU FINISHED {place} OF 9
          </div>
        )}
      </div>
    </div>
  );
}
