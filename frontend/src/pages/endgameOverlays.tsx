import type { ReactNode } from "react";
import { FinalStandings } from "../components/FinalStandings";
import { ReentryModal } from "../components/ReentryModal";
import { TournamentWinner } from "../components/TournamentWinner";
import type { PlayerView, TableState } from "../models/game";
import { resolveWinnerName } from "./endgame";

export interface EndgameOverlayInput {
  state: TableState;
  champion: PlayerView | null;
  previewWinner: boolean;
  previewName: string;
  fallbackName: string;
  heroPendingReentry: boolean;
  eliminationModalOpen: boolean;
  onContinue: () => void;
  onWatch: () => void;
  onEnd: () => void;
  onNewGame: () => void;
}

/** The champion screen covers the whole table; the re-entry / hero-out modal
 * sits on the felt. At most one of the two is shown. */
export function endgameOverlays(input: EndgameOverlayInput): { cover?: ReactNode; overlay?: ReactNode } {
  const { state, champion, previewWinner, heroPendingReentry } = input;
  if (state.standings) {  // the hero ended the game by chips (plan 092)
    return { cover: <FinalStandings rows={state.standings} onNewGame={input.onNewGame} /> };
  }
  if (previewWinner || champion !== null) {
    const name = resolveWinnerName(previewWinner, input.previewName, champion?.name ?? null, input.fallbackName);
    return {
      cover: (
        <TournamentWinner
          username={name}
          place={state.heroFinishPlace}
          heroIsChampion={champion ? champion.isHero : true}
          onNewSession={input.onNewGame}
        />
      ),
    };
  }
  if (!input.eliminationModalOpen) return {};
  return {
    overlay: (
      <ReentryModal
        available={heroPendingReentry}
        finishPlace={state.heroFinishPlace}
        onContinue={input.onContinue}
        onWatch={input.onWatch}
        onEnd={input.onEnd}
      />
    ),
  };
}
