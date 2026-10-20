/* The table in Spanish (plan 093 step 3a): buttons, sizes, the info rows, the
 * seats, the result, the bust and standings screens, the coach card's labels
 * and the menu. Numbers follow Spanish too: 45.000, 2,5 BB. */
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { CoachPanelView } from "../src/components/CoachPanelView";
import { FinalStandings } from "../src/components/FinalStandings";
import { HandResult } from "../src/components/HandResult";
import { HeroControls } from "../src/components/HeroControls";
import { PokerTable } from "../src/components/PokerTable";
import { ReentryModal } from "../src/components/ReentryModal";
import { TableHeader } from "../src/components/TableHeader";
import { I18nProvider } from "../src/i18n/I18n";
import { setCurrentLang } from "../src/i18n/lang";
import { formatChips } from "../src/models/game";
import { sampleReview, sampleTableState } from "../src/sampleState";

const es = (ui: ReactNode) => render(<I18nProvider initial="es">{ui}</I18nProvider>);
const noop = () => undefined;

afterEach(() => {
  cleanup();
  setCurrentLang("en");
});

describe("the table in Spanish", () => {
  it("names the buttons as Spanish players know them, with Spanish numbers", () => {
    es(<HeroControls toCall={2000} pot={4500} stack={45000} bigBlind={100} disabled={false} street="preflop"
      legalActions={[{ kind: "fold" }, { kind: "call" }, { kind: "raise", minAmount: 4000, maxAmount: 45000 }, { kind: "all_in", amount: 45000 }]}
      onAction={noop} />);
    expect(screen.getByRole("button", { name: "No ir" })).toHaveTextContent("NO IR");
    expect(screen.getByText("IGUALAR 2000")).toBeInTheDocument(); // Spain leaves 4 digits ungrouped
    expect(screen.getByText("STACK 45.000")).toBeInTheDocument();
    expect(screen.getByTestId("size-play")).toHaveTextContent(/^SUBIR A/);
    expect(screen.getByTestId("size-allin")).toHaveTextContent("All-in");
    expect(screen.getByTestId("size-2.5x")).toHaveTextContent("2,5x");
  });

  it("writes bet sizes in Spanish word order", () => {
    es(<HeroControls toCall={0} pot={1000} stack={45000} bigBlind={100} disabled={false} street="flop"
      legalActions={[{ kind: "check" }, { kind: "bet", minAmount: 100, maxAmount: 45000 }]} onAction={noop} />);
    expect(screen.getByTestId("size-play")).toHaveTextContent("APOSTAR 500");
    expect(screen.getByTestId("size-play")).toHaveTextContent("1/2 del bote");
    expect(screen.getByTestId("size-Pot")).toHaveTextContent("Bote");
    expect(screen.getByText("PASAR")).toBeInTheDocument();
  });

  it("reads the info rows and the seats in Spanish", () => {
    const state = { ...sampleTableState(), playersRemaining: 9, inHand: 4, totalChips: 405000,
      actionLog: [{ seat: 3, action: "call", amount: 100, street: "flop" }] };
    es(<PokerTable state={state} />);
    expect(screen.getByText("NIVEL 1 — 50/100")).toBeInTheDocument();
    expect(screen.getByText("MANO #7")).toBeInTheDocument();
    expect(screen.getByText("FICHAS TOTALES 405.000")).toBeInTheDocument();
    expect(screen.getByTestId("seat-3")).toHaveTextContent("IGUALA");
    expect(screen.getByTestId("seat-0")).toHaveTextContent("TÚ");
  });

  it("keeps the result colour while the title is Spanish", () => {
    const review = { ...sampleReview(), heroNet: 52150, heroWon: true, chop: false,
      showdown: [{ seat: 0, name: "Admin", cards: [], handName: null, isHero: true, won: true },
        { seat: 1, name: "Emma 1", cards: [], handName: null, isHero: false, won: true }] };
    es(<HandResult review={review} onReview={noop} onNext={noop} countdown={3} paused={false} />);
    expect(screen.getByTestId("hand-result")).toHaveClass("result-you-won");
    expect(screen.getByTestId("hand-result-title")).toHaveTextContent("HAS GANADO");
    expect(screen.getByTestId("hand-result-subtitle")).toHaveTextContent("+52.150 fichas · Emma 1 ganó el otro bote");
    expect(screen.getByTestId("next-hand-btn")).toHaveTextContent("SIGUIENTE MANO");
  });

  it("speaks Spanish after a bust and in the final standings", () => {
    es(<ReentryModal available={false} finishPlace={7} />);
    expect(screen.getByText("TERMINASTE 7.º DE 9")).toBeInTheDocument();
    expect(screen.getByTestId("reentry-end")).toHaveTextContent("TERMINAR PARTIDA");
    cleanup();
    es(<FinalStandings rows={[{ place: 1, seat: 2, name: "Emma 1", chips: 269000, isHero: false, out: false },
      { place: 2, seat: 0, name: "Admin", chips: 0, isHero: true, out: true }]} onNewGame={noop} />);
    expect(screen.getByText("CLASIFICACIÓN FINAL")).toBeInTheDocument();
    expect(screen.getByTestId("standing-1")).toHaveTextContent("1.ºEmma 1269.000");
    expect(screen.getByTestId("standing-2")).toHaveTextContent("2.ºAdmin (tú)FUERA");
  });

  it("labels the coach and the menu in Spanish", () => {
    es(<CoachPanelView testId="coach-panel" onToggle={noop}
      coach={{ recommendedAction: "CALL", street: "flop", reasoning: "x", detail: {} }} />);
    expect(screen.getByText("COACH ICM")).toBeInTheDocument();
    expect(screen.getByTestId("coach-street")).toHaveTextContent("en el flop");
    expect(screen.getByTestId("coach-toggle")).toHaveTextContent("OCULTAR");
    cleanup();
    es(<TableHeader state={sampleTableState()} username="Admin" paused={false} handOver isReview={false}
      onHome={noop} onMistakes={noop} onLogout={noop} onTogglePause={noop} />);
    fireEvent.click(screen.getByTestId("menu-btn"));
    expect(screen.getByTestId("table-menu")).toHaveTextContent("Jugando como Admin");
    expect(screen.getByTestId("menu-mistakes")).toHaveTextContent("MIS ERRORES");
    expect(screen.getByTestId("menu-logout")).toHaveTextContent("CERRAR SESIÓN");
  });

  it("leaves English numbers alone", () => {
    expect(formatChips(45000)).toBe("45,000");
  });
});
