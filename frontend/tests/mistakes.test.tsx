/* MY MISTAKES (plan 062): lists SUBOPTIMAL decisions from the hand history,
 * grouped and filterable, with the coach's line; clear empty states. A mistake
 * in a hand the hero won stays listed, marked WON, and can be hidden (plan 070). */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { MistakesPage } from "../src/pages/MistakesPage";

const { request } = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("../src/services/api", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  request,
}));

const decision = (street: string, heroAction: string, coachAction: string, grade: string) => ({
  street, heroAction, coachAction, grade, icmPressure: "HIGH",
  explanation: `Coach prefers ${coachAction} here.`, stackBb: 12.5, toCall: 3000, board: [] as string[],
});

const HANDS = [
  { handNumber: 1, heroPosition: "BTN", level: 1, blindLevel: "100/100", heroCards: ["Ah", "7c"], net: -4500,
    decisions: [decision("preflop", "ALL-IN", "FOLD", "SUBOPTIMAL")] },
  { handNumber: 2, heroPosition: "BB", level: 1, blindLevel: "100/100", heroCards: ["Kd", "Qs"], net: 1200,
    decisions: [decision("preflop", "CALL", "CALL", "PREFERRED"),
                { ...decision("flop", "CALL", "FOLD", "SUBOPTIMAL"), board: ["2h", "9s", "Jd"] }] },
  { handNumber: 3, heroPosition: "CO", level: 2, blindLevel: "150/300", heroCards: ["9h", "9d"], net: -100,
    decisions: [decision("preflop", "FOLD", "OPEN JAM", "SUBOPTIMAL")] },
];

function answer(tableId: string | null, hands: unknown[]) {
  request.mockImplementation(async (path: string) =>
    path === "/api/active-table" ? { tableId } : { hands });
}

async function renderPage() {
  render(<MemoryRouter><MistakesPage /></MemoryRouter>);
  await act(async () => undefined);
  await act(async () => undefined);
}

beforeEach(() => request.mockReset());

describe("My Mistakes page", () => {
  it("lists only SUBOPTIMAL decisions, newest hand first, with counts", async () => {
    answer("T1", HANDS);
    await renderPage();
    expect(screen.getByTestId("mistakes-summary").textContent).toBe("3 mistakes in 4 decisions over 3 hands; 1 in a hand you won.");
    const ids = screen.getAllByTestId(/^mistake-\d/).map((el) => el.getAttribute("data-testid"));
    expect(ids).toEqual(["mistake-3-preflop", "mistake-2-flop", "mistake-1-preflop"]);
    expect(screen.getByTestId("mistakes-filter-call").textContent).toBe("Wrong call (1)");
    expect(screen.getByTestId("mistakes-filter-allin").textContent).toBe("Wrong all-in (1)");
    expect(screen.getByTestId("mistakes-filter-fold").textContent).toBe("Wrong fold (1)");
  });

  it("shows the spot and the coach's line on each card", async () => {
    answer("T1", HANDS);
    await renderPage();
    const card = screen.getByTestId("mistake-2-flop");
    expect(card.textContent).toContain("Hand #2");
    expect(card.textContent).toContain("K♦Q♠");
    expect(card.textContent).toContain("Board");
    expect(card.textContent).toContain("Stack 12.5 BB · 3,000 to call");
    expect(card.textContent).toContain("You: CALL → Coach: FOLD");
    expect(card.textContent).toContain("Coach prefers FOLD here.");
    expect(card.textContent).toContain("ICM HIGH");
  });

  it("filters by what went wrong", async () => {
    answer("T1", HANDS);
    await renderPage();
    fireEvent.click(screen.getByTestId("mistakes-filter-allin"));
    expect(screen.getAllByTestId(/^mistake-\d/).map((el) => el.getAttribute("data-testid")))
      .toEqual(["mistake-1-preflop"]);
    fireEvent.click(screen.getByTestId("mistakes-filter-all"));
    expect(screen.getAllByTestId(/^mistake-\d/)).toHaveLength(3);
  });

  it("marks a mistake in a hand you won, and can hide those hands", async () => {
    answer("T1", HANDS);
    await renderPage();
    const won = screen.getByTestId("mistake-2-flop");
    expect(won).toHaveClass("mistake-won");
    expect(won.textContent).toContain("WON");
    expect(screen.getByTestId("mistake-1-preflop")).not.toHaveClass("mistake-won");
    expect(screen.getByTestId("mistake-1-preflop").textContent).not.toContain("WON");

    const hide = screen.getByTestId("mistakes-hide-won");
    expect(hide.textContent).toBe("Hide won hands (1)");
    fireEvent.click(hide);
    expect(hide).toHaveAttribute("aria-pressed", "true");
    expect(screen.getAllByTestId(/^mistake-\d/).map((el) => el.getAttribute("data-testid")))
      .toEqual(["mistake-3-preflop", "mistake-1-preflop"]);
    expect(screen.getByTestId("mistakes-filter-all").textContent).toBe("All (2)");
    expect(screen.getByTestId("mistakes-filter-call").textContent).toBe("Wrong call (0)");
    fireEvent.click(hide);
    expect(screen.getAllByTestId(/^mistake-\d/)).toHaveLength(3);
  });

  it("says so when the filters hide every mistake", async () => {
    answer("T1", [HANDS[1]]);
    await renderPage();
    fireEvent.click(screen.getByTestId("mistakes-hide-won"));
    expect(screen.queryAllByTestId(/^mistake-\d/)).toHaveLength(0);
    expect(screen.getByTestId("mistakes-none-shown")).toBeTruthy();
  });

  it("offers no hide button when no mistake is in a won hand", async () => {
    answer("T1", [HANDS[0], HANDS[2]]);
    await renderPage();
    expect(screen.queryByTestId("mistakes-hide-won")).toBeNull();
    expect(screen.getByTestId("mistakes-summary").textContent).toBe("2 mistakes in 2 decisions over 2 hands.");
  });

  it("says so when every decision matched the coach", async () => {
    answer("T1", [{ ...HANDS[1], decisions: [decision("preflop", "CALL", "CALL", "PREFERRED")] }]);
    await renderPage();
    expect(screen.getByTestId("mistakes-none")).toBeTruthy();
    expect(screen.queryAllByTestId(/^mistake-\d/)).toHaveLength(0);
  });

  it("asks for a practice session when there is no active table", async () => {
    answer(null, []);
    await renderPage();
    expect(screen.getByTestId("mistakes-no-table")).toBeTruthy();
    expect(request).toHaveBeenCalledTimes(1);
  });
});
