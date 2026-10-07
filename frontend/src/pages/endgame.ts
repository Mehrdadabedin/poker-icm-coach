/** Endgame presentation helpers shared by the table page and its tests. */

/** Development-only winner preview trigger. Always false for production
 * builds (import.meta.env.DEV is false there) and when the query parameter
 * is absent, so real tournament behavior is never affected. */
export function winnerPreviewEnabled(isDev: boolean, param: string | null): boolean {
  return isDev && param === "true";
}

/** Winner plaque name. Dev preview: the ?testWinnerName parameter (else the
 * signed-in username fallback). Real tournament: the champion's own name -
 * never the authenticated user. */
export function resolveWinnerName(
  previewWinner: boolean,
  previewName: string,
  championName: string | null,
  fallback: string,
): string {
  if (previewWinner) {
    return previewName || fallback;
  }
  return championName || fallback;
}

/** A39: BOT-only auto-finish is active when the hero is permanently out,
 * BOTs still remain, and no champion exists yet. */
export function autoFinishActive(
  heroEliminated: boolean,
  playersRemaining: number | undefined,
  championName: string | null,
): boolean {
  if (!heroEliminated || championName !== null) return false;
  return (playersRemaining ?? 9) > 1;
}
