/* END GAME after the hero is out (plan 092): the owner's example ranks Emma
 * with 269,000 1st and David with 156,000 2nd, down to 9th. */
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { FinalStandings } from "../src/components/FinalStandings";
import { ReentryModal } from "../src/components/ReentryModal";
import type { StandingRow } from "../src/models/game";
import { endgameOverlays } from "../src/pages/endgameOverlays";
import { sampleTableState } from "../src/sampleState";

const row = (place: number, name: string, chips: number, extra: Partial<StandingRow> = {}): StandingRow =>
  ({ place, seat: place, name, chips, isHero: false, out: false, ...extra });

const noop = () => undefined;

const ROWS: StandingRow[] = [
  row(1, "Emma 1", 269_000), row(2, "David 1", 156_000), row(3, "Alex 1", 120_000),
  row(4, "Sarah 1", 90_000), row(5, "Emma 2", 61_000), row(6, "Alex 2", 30_000),
  row(7, "Admin", 0, { isHero: true, out: true }), row(8, "David 2", 0, { out: true }),
  row(9, "Sarah 2", 0, { out: true }),
];

describe("final standings", () => {
  it("lists 1st to 9th with chips, the players out last, and marks the hero", () => {
    render(<FinalStandings rows={ROWS} />);
    expect(screen.getByTestId("standing-1")).toHaveTextContent("1STEmma 1269,000");
    expect(screen.getByTestId("standing-2")).toHaveTextContent("2NDDavid 1156,000");
    expect(screen.getByTestId("standing-7")).toHaveTextContent("7THAdmin (you)OUT");
    expect(screen.getByTestId("standing-7")).toHaveClass("is-hero", "is-out");
    expect(screen.getByTestId("standing-1")).toHaveClass("is-first");
    expect(screen.getByTestId("final-standings")).toHaveTextContent("you finished 7TH of 9");
  });

  it("starts a new game from the standings", () => {
    const onNewGame = vi.fn();
    render(<FinalStandings rows={ROWS} onNewGame={onNewGame} />);
    fireEvent.click(screen.getByTestId("standings-new-game"));
    expect(onNewGame).toHaveBeenCalledTimes(1);
  });

  it("covers the table once the state carries standings, before any modal", () => {
    const { cover, overlay } = endgameOverlays({
      state: { ...sampleTableState(), standings: ROWS }, champion: null, previewWinner: false,
      previewName: "", fallbackName: "", heroPendingReentry: true, eliminationModalOpen: true,
      onContinue: noop, onWatch: noop, onEnd: noop, onNewGame: noop,
    });
    expect(overlay).toBeUndefined();
    render(<>{cover}</>);
    expect(screen.getByTestId("final-standings")).toBeInTheDocument();
  });

  it("END GAME is offered with and without re-entry", () => {
    for (const available of [true, false]) {
      const onEnd = vi.fn();
      const { unmount } = render(<ReentryModal available={available} finishPlace={7} onEnd={onEnd} />);
      fireEvent.click(screen.getByTestId("reentry-end"));
      expect(onEnd).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId("reentry-watch")).toBeInTheDocument();
      unmount();
    }
  });
});
