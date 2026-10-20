/* The Report in Spanish (plan 093 step 5c). */
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { I18nProvider } from "../src/i18n/I18n";
import { setCurrentLang } from "../src/i18n/lang";
import { translate } from "../src/i18n/translate";
import { sizingInsight, type Report, type SizeKey } from "../src/models/report";
import { ReportPage } from "../src/pages/ReportPage";

const { request } = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("../src/services/api", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  request,
}));

const T = { status: "finished", endedAt: null, startingStack: 45000, hands: 3 };
const C = { ...T, tableId: "c1", tableLabel: "C", startedAt: "2026-10-12T19:00:00Z", finishPlace: 2 };
const B = { ...T, tableId: "b1", tableLabel: "B", startedAt: "2026-10-11T19:00:00Z", finishPlace: 6 };
const sizes = (street: "flop" | "turn" | "river", counts: number[]) => ({
  street, bets: counts.reduce((a, b) => a + b, 0),
  buckets: (["under25", "third", "half", "twoThirds", "pot", "over"] as SizeKey[]).map((size, i) => ({ size, count: counts[i] })) });

const REPORT: Report = {
  period: "30d", tournament: null,
  summary: { tournaments: 2, wins: 0, top3: 1, averageFinish: 4.5, hands: 1209, decisions: 15000,
    agreement: 72.7, mistakesPer100: 9.4, previous: { agreement: 66, mistakesPer100: 11.5 } },
  stack: { ...C, points: [{ hand: 0, stack: 45000, level: 1, mistakes: 0 }, { hand: 1, stack: 52000, level: 2, mistakes: 1 }] },
  heatmap: { positions: ["BB"], streets: ["preflop"], cells: [{ position: "BB", street: "preflop", decisions: 4, mistakes: 1 }] },
  leaks: [{ position: "BB", street: "preflop", heroAction: "CALL", coachAction: "FOLD", count: 3,
    hands: [{ tableId: "c1", handNumber: 3 }] }],
  mistakeTypes: [{ type: "call", count: 3 }, { type: "fold", count: 1 }, { type: "allin", count: 0 }, { type: "other", count: 0 }],
  stats: [{ key: "vpip", hits: 0, chances: 40, value: 31.5, low: 18, high: 26 },
    { key: "cbet", hits: 0, chances: 4, value: 50, low: 50, high: 70 }],
  progress: [{ ...B, agreement: 66, mistakesPer100: 12 }, { ...C, agreement: 75, mistakesPer100: 8 }],
  betSizes: [sizes("flop", [1, 8, 2, 1, 0, 0]), sizes("turn", [0, 1, 0, 0, 0, 0]), sizes("river", [0, 0, 0, 0, 0, 0])],
};

const tEs = (key: Parameters<typeof translate>[1], params?: Parameters<typeof translate>[2]) => translate("es", key, params);

afterEach(() => {
  cleanup();
  setCurrentLang("en");
  request.mockReset();
});

describe("the Report in Spanish", () => {
  it("lays out every section in Spanish", async () => {
    request.mockImplementation(async (path: string) => {
      if (path === "/api/active-table") return { tableId: null };
      if (path === "/api/history/tournaments") return { tournaments: [C, B] };
      return REPORT;
    });
    render(<I18nProvider initial="es"><MemoryRouter><ReportPage /></MemoryRouter></I18nProvider>);
    await act(async () => undefined);
    await act(async () => undefined);
    expect(screen.getByText("INFORME")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Últimos 30 días" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /^Mesa C · .* · terminado 2\.º · 3 manos$/ })).toBeInTheDocument();
    expect(screen.getByTestId("report-count").textContent).toBe("1209 manos, 15.000 decisiones valoradas por el coach");
    const summary = within(screen.getByTestId("report-summary"));
    for (const text of ["Torneos", "Puesto medio", "4,5", "72,7%", "▲ 6,7 frente a los 30 días anteriores",
      "▼ 2,1 frente a los 30 días anteriores", "Errores / 100 manos"]) {
      expect(summary.getByText(text)).toBeInTheDocument();
    }
    expect(screen.getByText(/^GRÁFICO DE STACK · MESA C, 12 OCT/)).toBeInTheDocument();
    expect(screen.getByText(/Terminado 2\.º\.$/)).toBeInTheDocument();
    const chart = within(screen.getByTestId("report-stack-chart"));
    expect(chart.getByText("N2")).toBeInTheDocument();
    expect(chart.getByText("mano 1")).toBeInTheDocument();
    expect(screen.getByTestId("report-stack-mistake")).toHaveAttribute("title", "Mano 1: 1 error, 52.000 fichas después");
    expect(screen.getByTestId("report-leak-1").textContent)
      .toBe("BB, preflop: IGUALAR cuando el coach dice NO IR3 vecesMesa C #3");
    expect(screen.getByTestId("report-type-call").textContent).toBe("Igualada errónea3");
    expect(screen.getByTestId("report-stat-vpip").textContent).toBe("VPIP (jugar la mano)31,5%18–26%por encima del rango");
    expect(screen.getByTestId("report-stat-cbet").lastElementChild?.textContent).toBe("pocas manos (4)");
    expect(screen.getByText("TAMAÑOS DE APUESTA")).toBeInTheDocument();
    expect(screen.getByTestId("report-size-third").textContent).toBe("67%Cerca de 1/3");
    expect(screen.getByTestId("report-sizes-insight").textContent)
      .toBe("Tu apuesta más habitual en el flop es de cerca de un tercio del bote (67% de tus apuestas).");
  });

  it("writes every bet-size line in Spanish", () => {
    setCurrentLang("es");
    expect(sizingInsight(sizes("turn", [0, 1, 0, 0, 0, 0]), tEs))
      .toBe("Solo 1 apuesta en el turn por ahora: juega más manos para ver un patrón.");
    expect(sizingInsight(sizes("river", [6, 2, 2, 0, 0, 0]), tEs)).toMatch(/^La mayoría de tus apuestas en el river son de menos/);
    expect(sizingInsight(sizes("river", [0, 2, 2, 0, 0, 6]), tEs)).toMatch(/^La mayoría de tus apuestas en el river superan el bote/);
  });
});
