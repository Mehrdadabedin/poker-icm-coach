/* Tournament winner screen tests: the supplied artwork with the dynamic
 * champion name on the plaque (never hardcoded), the hero's finishing place
 * when a BOT won, and START NEW SESSION. */
import { describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { TournamentWinner, ordinal } from "../src/components/TournamentWinner";
import { resolveWinnerName, winnerPreviewEnabled } from "../src/pages/TablePage";
import { tournamentChampion } from "../src/models/game";

describe("winnerPreviewEnabled (development-only trigger)", () => {
  it("enables the preview only in dev mode with the exact query value", () => {
    expect(winnerPreviewEnabled(true, "true")).toBe(true);
    expect(winnerPreviewEnabled(true, null)).toBe(false);
    expect(winnerPreviewEnabled(true, "1")).toBe(false);
    expect(winnerPreviewEnabled(true, "")).toBe(false);
  });

  it("never enables the preview outside development mode", () => {
    expect(winnerPreviewEnabled(false, "true")).toBe(false);
    expect(winnerPreviewEnabled(false, null)).toBe(false);
  });
});

const player = (seat: number, name: string, sitsOut = false, isHero = false) =>
  ({ seat, name, sitsOut, isHero } as never);

describe("tournamentChampion (existing tournament-finished state)", () => {
  it("returns the survivor when the current user wins", () => {
    const champion = tournamentChampion({ playersRemaining: 1, players: [player(0, "micky", false, true)] });
    expect(champion?.name).toBe("micky");
  });

  it("returns the BOT champion when a BOT wins", () => {
    const champion = tournamentChampion({
      playersRemaining: 1,
      players: [player(0, "micky", true, true), player(1, "Alex")],
    });
    expect(champion?.name).toBe("Alex");
  });

  it("returns null while more than one survivor remains (hand winner only)", () => {
    expect(tournamentChampion({
      playersRemaining: 2,
      players: [player(0, "micky"), player(1, "Alex")],
    })).toBeNull();
    expect(tournamentChampion({
      playersRemaining: 5,
      players: [player(0, "micky"), player(1, "Alex"), player(2, "Sarah"), player(3, "David"), player(4, "Emma")],
    })).toBeNull();
  });

  it("returns null when playersRemaining is missing but many players exist", () => {
    expect(tournamentChampion({
      players: [player(0, "micky"), player(1, "Alex"), player(2, "Sarah")],
    })).toBeNull();
  });
});

describe("resolveWinnerName (winner plaque data flow)", () => {
  it("uses ?testWinnerName for the dev preview", () => {
    expect(resolveWinnerName(true, "Alex", null, "micky")).toBe("Alex");
    expect(resolveWinnerName(true, "micky", null, "user")).toBe("micky");
    expect(resolveWinnerName(true, "Sarah", null, "user")).toBe("Sarah");
  });

  it("uses the real tournament champion, never the authenticated user", () => {
    // Alex is the champion, micky is the authenticated user: champion wins.
    expect(resolveWinnerName(false, "Alex", "Alex", "micky")).toBe("Alex");
    expect(resolveWinnerName(false, "", "Sarah", "micky")).toBe("Sarah");
    expect(resolveWinnerName(false, "nonsense", "David", "micky")).toBe("David");
  });

  it("lets no test query parameter affect production behavior", () => {
    expect(resolveWinnerName(false, "Alex", null, "micky")).toBe("micky");
    expect(winnerPreviewEnabled(false, "true")).toBe(false);
    expect(winnerPreviewEnabled(false, "true")).toBe(false);
  });
});

describe("TournamentWinner", () => {
  it("renders the champion artwork image", () => {
    render(<TournamentWinner username="meaantonio38" heroIsChampion />);
    const image = screen.getByTestId("tournament-winner-image");
    expect(image).toHaveAttribute("src", "/images/tournament-champion.png");
    expect(image).toHaveAttribute("alt", "Tournament Champion");
  });

  it("shows the current winning username inside the plaque", () => {
    render(<TournamentWinner username="meaantonio38" heroIsChampion />);
    expect(screen.getByTestId("tournament-winner-name")).toHaveTextContent("meaantonio38");
  });

  it("uses the username dynamically and never hardcodes it", () => {
    render(<TournamentWinner username="Alice" heroIsChampion />);
    expect(screen.getByTestId("tournament-winner-name")).toHaveTextContent("Alice");
    expect(screen.getByTestId("tournament-winner-name")).not.toHaveTextContent("meaantonio38");
  });

  it("falls back to Champ for an empty username", () => {
    render(<TournamentWinner username="" heroIsChampion />);
    expect(screen.getByTestId("tournament-winner-name")).toHaveTextContent("Champion");
  });

  it("offers START NEW SESSION only when a handler is given", () => {
    render(<TournamentWinner username="Alice" heroIsChampion />);
    expect(screen.queryByRole("button")).toBeNull();
    cleanup();
    const onNewSession = vi.fn();
    render(<TournamentWinner username="Alice" heroIsChampion onNewSession={onNewSession} />);
    fireEvent.click(screen.getByRole("button", { name: "START NEW SESSION" }));
    expect(onNewSession).toHaveBeenCalledTimes(1);
  });

  it("shows CONGRATULATIONS with the champion name (A45)", () => {
    render(<TournamentWinner username="Alex" heroIsChampion={false} place={3} />);
    expect(screen.getByTestId("tournament-winner-title")).toHaveTextContent("CONGRATULATIONS");
    expect(screen.getByTestId("tournament-winner-name")).toHaveTextContent("Alex");
  });

  it("keeps the painted YOU WON line when the hero is the champion", () => {
    render(<TournamentWinner username="micky" heroIsChampion place={1} />);
    expect(screen.queryByTestId("tournament-winner-place")).toBeNull();
  });

  it("shows a placeholder place when a BOT won and the place is unknown", () => {
    render(<TournamentWinner username="Alex" heroIsChampion={false} />);
    expect(screen.getByTestId("tournament-winner-place")).toHaveTextContent("YOU FINISHED ? OF 9");
  });
});

describe("ordinal", () => {
  it("uses ST / ND / RD / TH, with TH for 11-13", () => {
    expect([1, 2, 3, 4, 9, 11, 12, 13, 21, 22, 23].map(ordinal)).toEqual(
      ["1ST", "2ND", "3RD", "4TH", "9TH", "11TH", "12TH", "13TH", "21ST", "22ND", "23RD"],
    );
  });
});
