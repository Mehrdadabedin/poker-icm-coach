import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { PokerTable } from "../src/components/PokerTable";
import { sampleTableState } from "../src/sampleState";

describe("PokerTable", () => {
  it("renders nine seats", () => {
    render(<PokerTable state={sampleTableState()} />);
    for (let i = 0; i < 9; i++) {
      expect(screen.getByTestId(`seat-${i}`)).toBeInTheDocument();
    }
  });

  it("shows hero hole cards", () => {
    render(<PokerTable state={sampleTableState()} />);
    expect(screen.getByTestId("card-As")).toBeInTheDocument();
    expect(screen.getByTestId("card-Kh")).toBeInTheDocument();
  });

  it("shows community cards and pot", () => {
    render(<PokerTable state={sampleTableState()} />);
    expect(screen.getByTestId("card-9c")).toBeInTheDocument();
    expect(screen.getByTestId("card-Jd")).toBeInTheDocument();
    expect(screen.getByTestId("pot-amount")).toHaveTextContent("POT 3,400");
  });

  it("marks the dealer seat", () => {
    render(<PokerTable state={sampleTableState(0, 8)} />);
    expect(screen.getByTestId("dealer-8")).toBeInTheDocument();
  });

  it("marks the current actor seat as active", () => {
    const state = { ...sampleTableState(), currentActor: 4 };
    render(<PokerTable state={state} />);
    expect(screen.getByTestId("seat-4")).toHaveAttribute("data-active", "true");
    expect(screen.getByTestId("seat-3")).toHaveAttribute("data-active", "false");
  });

  it("highlights the hero seat", () => {
    render(<PokerTable state={sampleTableState()} />);
    expect(screen.getByTestId("seat-0").className).toContain("seat-hero");
  });

  it("shows chip stacks and BB", () => {
    render(<PokerTable state={sampleTableState()} />);
    expect(screen.getByTestId("seat-4")).toHaveTextContent("5,100");
    expect(screen.getByTestId("seat-4")).toHaveTextContent("51 BB");
  });
});



  it("renders BOT profile portraits inside the right seats", () => {
    const profiles = ["tag", "tag", "lag", "lag",
                      "tight_passive", "tight_passive", "loose_passive", "loose_passive"];
    const state = sampleTableState();
    state.players = state.players.map((p, i) =>
      i === 0 ? p : { ...p, profile: profiles[i - 1] });
    render(<PokerTable state={state} />);
    // human seat has no portrait
    expect(screen.getByTestId("seat-0").querySelector(".seat-bot-portrait")).toBeNull();
    // each BOT seat shows its profile portrait
    const expected = [
      ["seat-1", "alex.png", "Alex bot profile"],
      ["seat-2", "alex.png", "Alex bot profile"],
      ["seat-3", "sarah.png", "Sarah bot profile"],
      ["seat-4", "sarah.png", "Sarah bot profile"],
      ["seat-5", "david.png", "David bot profile"],
      ["seat-6", "david.png", "David bot profile"],
      ["seat-7", "emma.png", "Emma bot profile"],
      ["seat-8", "emma.png", "Emma bot profile"],
    ];
    for (const [seat, file, alt] of expected) {
      const img = screen.getByTestId(seat).querySelector(".seat-bot-portrait");
      expect(img).not.toBeNull();
      expect((img as HTMLImageElement).getAttribute("src")).toBe(`/images/bot-profiles/${file}`);
      expect((img as HTMLImageElement).getAttribute("alt")).toBe(alt);
    }
    // names are unchanged by the portraits
    expect(screen.getByTestId("seat-1").textContent).toContain("Bot 1");
  });
  it("renders profile-based BOT display names", () => {
    const names = ["Alex 1", "Alex 2", "Sarah 1", "David 1", "David 2", "David 3", "Emma 1", "Emma 2"];
    const state = sampleTableState();
    state.players = state.players.map((p, i) => (i === 0 ? p : { ...p, name: names[i - 1] }));
    render(<PokerTable state={state} />);
    for (const name of names) {
      expect(screen.getByText(name)).toBeInTheDocument();
    }
    expect(screen.getByText("Alice")).toBeInTheDocument(); // human seat unchanged
  });

describe("TablePage", () => {
  it("renders the screen with title (API mock)", async () => {
    vi.mock("../src/services/api", async (importOriginal) => ({
      ...(await importOriginal<Record<string, unknown>>()),
      getToken: vi.fn(() => "token"),
      getUsername: vi.fn(() => "Alice"),
      saveAuth: vi.fn(),
      clearAuth: vi.fn(),
      login: vi.fn(async () => ({ token: "token", username: "Alice" })),
      register: vi.fn(async () => ({ username: "Alice", registered: true })),
      logout: vi.fn(async () => ({ ok: true })),
      me: vi.fn(async () => ({ username: "Alice" })),
      getState: vi.fn(async () => sampleTableState()),
      sendAction: vi.fn(async () => sampleTableState()),
      nextHand: vi.fn(async () => sampleTableState()),
      coachAdvice: vi.fn(async () => ({
        recommendedAction: "RAISE",
        confidence: 0.8,
        reasoning: "AJs is in the open range.",
        alternativeAction: "CALL",
        detail: { POSITION: "BTN", "STACK": "30,000" },
      })),
      coachCompare: vi.fn(async () => null),
      request: vi.fn(async () => ({
        startingStack: 45000, startingSmallBlind: 100, startingBigBlind: 100,
        blindLevelMinutes: 20, fastMode: false,
        showActionLabels: true, showResultLabels: true,
      })),
    }));
    const { TablePage: TablePageLive } = await import("../src/pages/TablePage");
    render(
      <MemoryRouter initialEntries={["/table/local-1"]}>
        <Routes>
          <Route path="/table/:tableId" element={<TablePageLive />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText("ICM MASTER")).toBeInTheDocument();
  });
});
