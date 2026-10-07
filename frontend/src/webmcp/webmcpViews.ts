import type { Card, HandReview, PlayerView, TableState } from "../models/game";
import type { GameToolActions, HandHistoryEntry } from "./webmcpTypes";

export function publicPlayer(player: PlayerView) {
  const { holeCards, ...visible } = player;
  return player.isHero && holeCards ? { ...visible, holeCards } : visible;
}

export function publicReview(review: HandReview | null | undefined) {
  if (!review) return null;
  return {
    handNumber: review.handNumber,
    pot: review.pot,
    board: review.board,
    heroSeat: review.heroSeat,
    heroCards: review.heroCards,
    heroStart: review.heroStart,
    heroEnd: review.heroEnd,
    heroNet: review.heroNet,
    heroWon: review.heroWon,
    chop: review.chop,
    heroPosition: review.heroPosition,
    winners: review.winners,
    foldedSeats: review.foldedSeats,
    allInSeats: review.allInSeats,
    showdown: review.showdown.map(({ seat, name, cards, handName, isHero, won }) => ({
      seat, name, cards, handName, isHero, won,
    })),
    actions: review.actions.map(({ seat, name, action, amount, street }) => ({
      seat, name, action, amount, street,
    })),
    winningHandName: review.winningHandName,
    heroHandName: review.heroHandName,
    pressure: review.pressure,
  };
}

export function publicGameState(state: TableState, isPaused: boolean, countdown: number | null) {
  const currentPlayer = state.players.find((player) => player.seat === state.currentActor) ?? null;
  const status = (state as TableState & { status?: string }).status;
  return {
    table: { id: state.tableId, label: state.tableLabel ?? null },
    tournament: {
      status: status ?? null,
      handNumber: state.handNumber,
      playersRemaining: state.playersRemaining ?? null,
      playersInHand: state.inHand ?? null,
      totalChips: state.totalChips ?? null,
      averageStack: state.averageStack ?? null,
      blindLevel: state.level,
      timer: {
        secondsLeft: state.secondsLeft,
        inBreak: state.inBreak ?? false,
        autoNextPaused: isPaused,
        autoNextCountdown: countdown,
      },
    },
    phase: state.phase,
    street: state.street,
    currentPlayer: currentPlayer ? publicPlayer(currentPlayer) : null,
    players: state.players.map(publicPlayer),
    blinds: { small: state.smallBlind, big: state.bigBlind, ante: state.ante },
    pot: state.pot,
    board: state.communityCards as Card[],
    availableActions: state.legalActions,
    toCall: state.toCall,
    dealerSeat: state.dealerSeat,
    heroSeat: state.heroSeat,
    waitingForHero: state.waitingForHero,
    actionLog: state.actionLog ?? [],
    result: publicReview(state.review),
  };
}

export function publicCurrentHand(state: TableState) {
  return {
    handNumber: state.handNumber,
    phase: state.phase,
    street: state.street,
    players: state.players.map(publicPlayer),
    currentActor: state.currentActor,
    waitingForHero: state.waitingForHero,
    blinds: { small: state.smallBlind, big: state.bigBlind, ante: state.ante },
    pot: state.pot,
    board: state.communityCards,
    toCall: state.toCall,
    availableActions: state.legalActions,
    actions: state.actionLog ?? [],
    result: publicReview(state.review),
  };
}

export function publicHistoryEntry(entry: HandHistoryEntry) {
  return {
    handNumber: entry.handNumber,
    heroPosition: entry.heroPosition,
    pot: entry.pot,
    winnerSeats: entry.winnerSeats,
    stage: entry.stage,
    net: entry.net,
    heroDecision: entry.heroDecision,
    coachRecommendation: entry.coachRecommendation,
    grade: entry.grade,
    level: entry.level,
    blindLevel: entry.blindLevel,
  };
}

export function actionFailure() {
  return { ok: false, error: "Action was not applied. Check the current game state and try again." };
}

export async function runAction(actions: GameToolActions,
                                kind: Parameters<GameToolActions["act"]>[0],
                                amount?: number) {
  if (!actions.getState()) return actionFailure();
  const state = await actions.act(kind, amount);
  return state
    ? { ok: true, gameState: publicGameState(state, actions.isPaused(), actions.countdown()) }
    : actionFailure();
}
