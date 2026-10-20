/* The Hand History page in Spanish (plan 093 step 5b). */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { I18nProvider } from "../src/i18n/I18n";
import { setCurrentLang } from "../src/i18n/lang";
import { HistoryPage } from "../src/pages/HistoryPage";

const { request } = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("../src/services/api", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  request,
}));

const hand = (n: number, net: number, extra: Record<string, unknown> = {}) => ({
  handNumber: n, heroPosition: "CO", pot: 45000, winnerSeats: net > 0 ? [0] : [5], seatNames: undefined,
  net, heroDecision: "CALL", coachRecommendation: "FOLD", grade: "SUBOPTIMAL", level: 1, blindLevel: "100/200", ...extra,
});
const SAVED = [
  { tableId: "live1", tableLabel: "B", startedAt: null, endedAt: null, status: "active", finishPlace: null, hands: 2 },
  { tableId: "old1", tableLabel: "A", startedAt: null, endedAt: null, status: "finished", finishPlace: 5, hands: 1 },
  { tableId: "gone", tableLabel: "C", startedAt: null, endedAt: null, status: "active", finishPlace: null, hands: 7 },
];

beforeEach(() => request.mockImplementation(async (path: string) => {
  if (path === "/api/active-table") return { tableId: "live1", tableLabel: "B" };
  if (path === "/api/history/tournaments") return { tournaments: SAVED };
  return { hands: [hand(1, 12000), hand(2, -1100, { grade: "PREFERRED", heroDecision: "FOLD" })] };
}));
afterEach(() => {
  cleanup();
  setCurrentLang("en");
  request.mockReset();
});

describe("Hand History in Spanish", () => {
  it("names the tournaments, the filters and the rows in Spanish", async () => {
    render(<I18nProvider initial="es"><MemoryRouter><HistoryPage /></MemoryRouter></I18nProvider>);
    await act(async () => undefined);
    await act(async () => undefined);
    expect(screen.getByText("HISTORIAL DE MANOS")).toBeInTheDocument();
    const labels = Array.from((screen.getByTestId("history-tournament") as HTMLSelectElement).options)
      .map((o) => o.textContent);
    expect(labels).toEqual(["Mesa B · en curso · 2 manos", "Mesa A · terminado 5.º · 1 mano",
      "Mesa C · sin terminar · 7 manos"]);
    expect(screen.getByTestId("history-count").textContent).toBe("2 manos terminadas");
    expect(screen.getByText("NIVEL 1 (ciegas 100/200)")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Valoración" })).toBeInTheDocument();
    const won = within(screen.getByTestId("history-hand-1"));
    for (const text of ["45.000", "Tú", "+12.000", "IGUALAR", "NO IR", "SUBÓPTIMA"]) {
      expect(won.getByText(text)).toBeInTheDocument();
    }
    expect(within(screen.getByTestId("history-hand-2")).getByText("Asiento 5")).toBeInTheDocument();
    expect(within(screen.getByTestId("history-hand-2")).getByText("PREFERIDA")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Todos los resultados" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Nivel 1" })).toBeInTheDocument();
    expect(screen.getByText("Solo errores")).toBeInTheDocument();
  });
});
