/* Tournament winner screen: the supplied champion artwork fills the central
 * table area when the current user wins the entire tournament (existing
 * tournament-end state). Only the winning username is dynamically rendered,
 * positioned inside the artwork's empty name plaque; no buttons, no extra
 * text, no game logic. */
export function TournamentWinner({ username }: { username: string }) {
  const display = username?.trim() || "Champion";
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
        <div className="tournament-winner-name" data-testid="tournament-winner-name">
          {display}
        </div>
      </div>
    </div>
  );
}
