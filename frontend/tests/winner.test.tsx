/* Tournament winner screen tests: the supplied artwork renders with only the
 * dynamic winning username overlaid on the empty plaque. No buttons and no
 * extra text; the username is never hardcoded. */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { TournamentWinner } from "../src/components/TournamentWinner";
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

describe("tournamentChampion (existing tournament-finished state)", () => {
  const player = (seat: number, name: string, sitsOut = false, isHero = false) =>
    ({ seat, name, sitsOut, isHero } as never);

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
    render(<TournamentWinner username="meaantonio38" />);
    const image = screen.getByTestId("tournament-winner-image");
    expect(image).toHaveAttribute("src", "/images/tournament-champion.png");
    expect(image).toHaveAttribute("alt", "Tournament Champion");
  });

  it("shows the current winning username inside the plaque", () => {
    render(<TournamentWinner username="meaantonio38" />);
    expect(screen.getByTestId("tournament-winner-name")).toHaveTextContent("meaantonio38");
  });

  it("uses the username dynamically and never hardcodes it", () => {
    render(<TournamentWinner username="Alice" />);
    expect(screen.getByTestId("tournament-winner-name")).toHaveTextContent("Alice");
    expect(screen.getByTestId("tournament-winner-name")).not.toHaveTextContent("meaantonio38");
  });

  it("falls back to Champ for an empty username", () => {
    render(<TournamentWinner username="" />);
    expect(screen.getByTestId("tournament-winner-name")).toHaveTextContent("Champion");
  });

  it("adds no buttons or extra text", () => {
    render(<TournamentWinner username="Alice" />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByText(/play again|new tournament|home/i)).toBeNull();
  });

  it("is an overlay layer (absolute positioning supplied by winner.css)", () => {
    render(<TournamentWinner username="Alice" />);
    const overlay = screen.getByTestId("tournament-winner");
    // jsdom does not load CSS, so the overlay contract is the dedicated class
    // that winner.css positions absolutely over the felt
    expect(overlay.classList.contains("tournament-winner")).toBe(true);
  });
});
