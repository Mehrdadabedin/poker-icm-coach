import { Card, PlayerView, formatChips } from "../models/game";
import { botProfilePortrait } from "../models/botProfiles";
import { CardView } from "./CardView";
import { PlayingCard } from "./PlayingCard";
import { useT } from "../i18n/I18n";
import { getToken } from "../services/api";
import { useApprovedPortrait } from "../services/portraitApi";

interface PokerSeatProps {
  player: PlayerView;
  active: boolean;
  lastAction?: string;
  status?: "won" | "lost" | "folded" | "allIn" | null;
  revealCards?: Card[] | null;
  revealHand?: string | null;
}

/** One seat on the poker table: stack, position, bet, cards, indicators. */
export function PokerSeat({ player, active, lastAction, status, revealCards, revealHand }: PokerSeatProps) {
  const t = useT();
  const portrait = player.isHero ? null : (player.profile ? botProfilePortrait(player.profile) : null);
  const heroPortrait = useApprovedPortrait(player.isHero);
  // Real cards when known (hero, showdown); a BOT still in the hand shows two
  // backs; folded seats show none. Busted seats take the OUT branch below.
  const shown = revealCards && revealCards.length === 2
    ? revealCards
    : player.holeCards && player.holeCards.length === 2 ? player.holeCards : null;
  const classes = [
    "seat",
    player.isHero ? "seat-hero" : "",
    active ? "seat-active" : "",
    player.folded ? "seat-folded" : "",
    player.sitsOut ? "seat-out" : "",
    status ? `seat-${status}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes} data-testid={`seat-${player.seat}`} data-seat={player.seat} data-active={active} data-status={status ?? ""}>
      {player.isDealer && (
        <span className="dealer-button" data-testid={`dealer-${player.seat}`}>
          D
        </span>
      )}
      <div className="seat-position">
        {player.position} {player.position === "SB" || player.position === "BB" ? "•" : ""}
      </div>
      <div className="seat-who">
        {portrait && (
          <img
            className="seat-bot-portrait"
            src={portrait.src}
            alt={t("seat.botProfile", { name: portrait.alt })}
            style={{ borderColor: portrait.color }}
            draggable={false}
          />
        )}
        {heroPortrait ? (
          <img className="seat-bot-portrait seat-hero-portrait" src={heroPortrait} alt={t("portrait.alt")}
            draggable={false} data-testid="seat-hero-portrait" />
        ) : player.isHero && getToken() && (
          // until a photo is approved, the initial keeps every seat alike; the letter
          // comes from CSS so the seat's text stays the name and stack
          <span className="seat-bot-portrait seat-hero-initial" data-initial={player.name.charAt(0).toUpperCase()}
            aria-hidden="true" data-testid="seat-hero-initial" />
        )}
        <div className="seat-name">{player.name}</div>
      </div>
      {player.sitsOut ? (
        <div className="seat-out-label">{t("seat.out")}</div>
      ) : (
        <>
          <div className="seat-stack">
            {formatChips(player.stack)} · <span className="seat-bb">{player.stackInBB} BB</span>
          </div>
          <div className={`seat-cards ${player.isHero ? "hero-cards" : ""}`}>
            {shown
              ? shown.map((c, i) => <CardView key={i} card={c} />)
              : !player.isHero && !player.folded && (
                <>
                  <PlayingCard faceDown className="seat-card-back" />
                  <PlayingCard faceDown className="seat-card-back" />
                </>
              )}
          </div>
          {revealHand && <div className="seat-reveal-hand">{revealHand}</div>}
        </>
      )}
      {player.bet > 0 && !player.folded && !status && (
        <div className="seat-bet" data-testid={`bet-${player.seat}`}>
          {formatChips(player.bet)}
        </div>
      )}
      {status === "won" && <div className="seat-status seat-status-won">{t("seat.won")}</div>}
      {status === "lost" && <div className="seat-status seat-status-lost">{t("seat.lost")}</div>}
      {status === "allIn" && <div className="seat-status seat-status-allin">{t("seat.allIn")}</div>}
      {lastAction && !status && <div className="seat-status seat-status-action">{lastAction}</div>}
      {player.folded && <div className="seat-fold-label">{t("seat.folded")}</div>}
    </div>
  );
}
