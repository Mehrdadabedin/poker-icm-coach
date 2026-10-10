/* MY MISTAKES (plan 062): lists SUBOPTIMAL decisions from the hand history,
 * grouped and filterable, with the coach's line; clear empty states. */
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
  { handNumber: 1, heroPosition: "BTN", level: 1, blindLevel: "100/100", heroCards: ["Ah", "7c"],
    decisions: [decision("preflop", "ALL-IN", "FOLD", "SUBOPTIMAL")] },
  { handNumber: 2, heroPosition: "BB", level: 1, blindLevel: "100/100", heroCards: ["Kd", "Qs"],
    decisions: [decision("preflop", "CALL", "CALL", "PREFERRED"),
                { ...decision("flop", "CALL", "FOLD", "SUBOPTIMAL"), board: ["2h", "9s", "Jd"] }] },
  { handNumber: 3, heroPosition: "CO", level: 2, blindLevel: "150/300", heroCards: ["9h", "9d"],
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
    expect(screen.getByTestId("mistakes-summary").textContent).toBe("3 mistakes in 4 decisions over 3 hands.");
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
