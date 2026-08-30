import { Card, PlayerView, TableState, chipsInBB } from "./models/game";

const POSITIONS = ["UTG", "UTG+1", "MP", "LJ", "HJ", "CO", "BTN", "SB", "BB"];
const CHIPS = [32100, 27800, 45000, 39400, 5100, 42900, 41000, 8200, 43500];

/** Static sample table state used by App and tests until the API lands. */
export function sampleTableState(heroSeat = 0, dealerSeat = 8): TableState {
  const players: PlayerView[] = POSITIONS.map((position, i) => {
    const base: PlayerView = {
      seat: i,
      name: i === heroSeat ? "Hero" : `Bot ${i}`,
      stack: CHIPS[i],
      stackInBB: chipsInBB(CHIPS[i], 100),
      position,
      bet: 0,
      folded: false,
      isHero: i === heroSeat,
      isDealer: i === dealerSeat,
      sitsOut: false,
    };
    if (i === heroSeat) {
      const heroCards: Card[] = [
        { rank: "A", suit: "s" },
        { rank: "K", suit: "h" },
      ];
      base.holeCards = heroCards;
    }
    return base;
  });
  return {
    tableId: "local-1",
    handNumber: 7,
    players,
    communityCards: [
      { rank: "9", suit: "c" },
      { rank: "J", suit: "d" },
      { rank: "2", suit: "s" },
    ],
    pot: 3400,
    smallBlind: 50,
    bigBlind: 100,
    ante: 0,
    level: 1,
    secondsLeft: 1142,
    street: "flop",
    currentActor: 2,
    dealerSeat,
    heroSeat,
    waitingForHero: false,
    phase: "playing",
    legalActions: [{ kind: "fold" }, { kind: "check" }, { kind: "bet", minAmount: 100, maxAmount: 45000 }],
    toCall: 0,
  };
}
