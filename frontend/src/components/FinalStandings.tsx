import { formatChips, type StandingRow } from "../models/game";
import { useI18n } from "../i18n/I18n";
import { placeOrdinal } from "../i18n/lang";

/** The final standings once the busted hero ends the game (plan 092): the
 * players still in by chips, then the players already out in the order they
 * went. It covers the table like the champion screen. */
export function FinalStandings({ rows, onNewGame }: { rows: StandingRow[]; onNewGame?: () => void }) {
  const { lang, t } = useI18n();
  const ordinal = (n: number) => placeOrdinal(lang, n);
  const hero = rows.find((r) => r.isHero);
  return (
    <div className="tournament-winner final-standings" data-testid="final-standings" role="dialog"
      aria-label={t("standings.label")}>
      <div className="final-standings-panel">
        <div className="final-standings-head">
          <div>
            <b className="final-standings-title">{t("standings.title")}</b>
            <p className="final-standings-note">
              {t("standings.ended")}
              {hero ? t("standings.youFinished", { place: ordinal(hero.place), n: rows.length }) : ""}
            </p>
          </div>
          {onNewGame && (
            <button type="button" className="btn btn-small btn-primary" onClick={onNewGame}
              data-testid="standings-new-game">
              {t("standings.newGame")}
            </button>
          )}
        </div>
        <ol className="final-standings-list">
          {rows.map((r) => (
            <li key={r.seat} data-testid={`standing-${r.place}`}
              className={[r.isHero && "is-hero", r.place === 1 && "is-first", r.out && "is-out"]
                .filter(Boolean).join(" ")}>
              <span className="standing-place">{ordinal(r.place)}</span>
              <span className="standing-name">{r.name}{r.isHero ? t("standings.you") : ""}</span>
              <span className="standing-chips">{r.out ? t("standings.out") : formatChips(r.chips)}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
