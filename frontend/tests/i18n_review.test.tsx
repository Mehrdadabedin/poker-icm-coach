/* The hand review and the hand history in Spanish (plan 093 step 3b). Hand
 * names and the bots' reasons are in i18n_hands.test.tsx (step 4b). */
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { ActionHistory } from "../src/components/ActionHistory";
import { BotExplanations } from "../src/components/BotExplanations";
import { HandReview } from "../src/components/HandReview";
import { ShowdownHands } from "../src/components/ShowdownHands";
import { OverallPerformance, WinLoseAnalysis } from "../src/components/WinLoseAnalysis";
import { I18nProvider } from "../src/i18n/I18n";
import { setCurrentLang } from "../src/i18n/lang";
import type { HandHistoryEntry } from "../src/models/game";
import { sampleReview } from "../src/sampleState";

const es = (ui: ReactNode) => render(<I18nProvider initial="es">{ui}</I18nProvider>);
const names = new Map([[0, "Admin"], [1, "Emma 1"], [4, "David 1"]]);
const hand = (handNumber: number, net: number, heroPosition: string): HandHistoryEntry => ({
  handNumber, heroPosition, pot: 400, winnerSeats: [], stage: "EARLY", net, heroDecision: null,
  coachRecommendation: null, grade: null, level: 1, blindLevel: "50/100" });

afterEach(() => {
  cleanup();
  setCurrentLang("en");
});

describe("the hand review in Spanish", () => {
  it("labels the facts, keeps the result colour and translates the ICM pressure", () => {
    es(<HandReview review={{ ...sampleReview(), pressure: "HIGH" }} coach={null} comparison={null}
      totalPlayers={9} nameBySeat={names} onBack={() => undefined} />);
    expect(screen.getByTestId("hand-history-title")).toHaveTextContent("HISTORIAL DE LA MANO");
    expect(screen.getByText("MANO #7")).toBeInTheDocument();
    expect(screen.getByTestId("result-banner")).toHaveClass("result-you-won");
    expect(screen.getByTestId("result-banner")).toHaveTextContent("HAS GANADO+3400 fichas");
    expect(screen.getByText("MANO GANADORA")).toBeInTheDocument();
    expect(screen.getByText("PRESIÓN ICM").nextSibling).toHaveTextContent("ALTA");
    expect(screen.getByTestId("back-to-table-btn")).toHaveTextContent("VOLVER A LA MESA");
  });

  it("shows the showdown in Spanish", () => {
    es(<ShowdownHands showdown={sampleReview().showdown} foldedSeats={[4, 6]} nameBySeat={names} heroSeat={0} />);
    expect(screen.getByText("MANOS EN EL SHOWDOWN")).toBeInTheDocument();
    expect(screen.getByText(/Alice\s*\(Tú\)/)).toBeInTheDocument();
    expect(screen.getByText("GANA")).toBeInTheDocument();
    expect(screen.getByText("Asiento 6")).toBeInTheDocument();
    expect(screen.getAllByText("NO VA")).toHaveLength(2);
  });

  it("explains the bots in Spanish", () => {
    es(<BotExplanations explanations={[{ seat: 1, name: "Emma 1", action: "call", amount: 200, street: "flop",
      position: "BTN", hand: "Q♣ J♣", handCode: "QJs", stackBB: 45, potOdds: "25%", equity: "38%",
      icmPressure: "LOW", faced: "Bet 200", reason: "x" }]} />);
    expect(screen.getByText("POR QUÉ JUGARON ASÍ LOS BOTS")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Emma 1 — Iguala 200/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Emma 1/ }));
    expect(screen.getByText("Presión ICM").nextSibling).toHaveTextContent("BAJA");
  });
});

describe("the hand history in Spanish", () => {
  it("names streets, blinds and actions the Spanish way", () => {
    es(<ActionHistory heroSeat={0} nameBySeat={names} actions={[
      { seat: 4, action: "big_blind", amount: 200, street: "preflop" },
      { seat: 1, action: "raise", amount: 500, street: "preflop" },
      { seat: 0, action: "call", amount: 500, street: "preflop" },
    ]} />);
    expect(screen.getByText("HISTORIAL")).toBeInTheDocument();
    expect(screen.getByText("PREFLOP")).toBeInTheDocument();
    expect(screen.getByText(/pone la ciega grande/)).toBeInTheDocument();
    expect(screen.getByTestId("history-preflop-0")).toHaveTextContent("Emma 1 — Sube 500");
    expect(screen.getByTestId("history-preflop-1")).toHaveTextContent("Admin — Iguala 500");
  });

  it("reads the results in Spanish, with Spanish numbers", () => {
    const hands = [hand(1, 12000, "BTN"), hand(2, -300, "SB")];
    es(<OverallPerformance hands={hands} />);
    expect(screen.getByText("RENDIMIENTO GENERAL")).toBeInTheDocument();
    expect(screen.getByTestId("wl-profit")).toHaveTextContent("+11.700 fichas");
    cleanup();
    es(<WinLoseAnalysis hands={hands} currentLevel={1} />);
    expect(screen.getByText("RESULTADOS POR POSICIÓN")).toBeInTheDocument();
    expect(screen.getByTestId("wl-level-1")).toHaveTextContent("Nivel 1(ciegas 50/100)ACTUAL");
  });
});
