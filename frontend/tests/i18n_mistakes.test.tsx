/* The page header and My Mistakes in Spanish (plan 093 step 5a). The coach's
 * reason is written from the code the hand history keeps with each decision. */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { I18nProvider } from "../src/i18n/I18n";
import { setCurrentLang } from "../src/i18n/lang";
import { MistakesPage } from "../src/pages/MistakesPage";

const { request } = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("../src/services/api", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  request,
  getUsername: () => "Admin",
}));

const coded = {
  street: "preflop", heroAction: "CALL", coachAction: "FOLD", grade: "SUBOPTIMAL", icmPressure: "VERY HIGH",
  explanation: "J7o is not in the CO open range.", stackBb: 12.5, toCall: 45000, board: [] as string[],
  reasonCode: "open_out", reasonParams: { hand: "J7o", pos: "CO" },
};
const HANDS = [
  { handNumber: 4, heroPosition: "CO", level: 2, blindLevel: "150/300", heroCards: ["Jh", "7c"], net: 900,
    decisions: [coded, { ...coded, street: "flop", grade: "PREFERRED" }] },
  { handNumber: 5, heroPosition: "BB", level: 2, blindLevel: "150/300", heroCards: ["9h", "9d"], net: -300,
    decisions: [{ ...coded, heroAction: "FOLD", coachAction: "OPEN JAM", reasonCode: undefined,
      reasonParams: undefined, explanation: "Saved before the codes." }] },
];

async function renderSpanish() {
  render(<I18nProvider initial="es"><MemoryRouter><MistakesPage /></MemoryRouter></I18nProvider>);
  await act(async () => undefined);
  await act(async () => undefined);
}

beforeEach(() => request.mockImplementation(async (path: string) =>
  path === "/api/active-table" ? { tableId: "T1" } : { hands: HANDS }));
afterEach(() => {
  cleanup();
  setCurrentLang("en");
  request.mockReset();
});

describe("My Mistakes in Spanish", () => {
  it("counts, filters and the header in Spanish", async () => {
    await renderSpanish();
    expect(screen.getByText("MIS ERRORES")).toBeInTheDocument();
    expect(screen.getByTestId("mistakes-summary").textContent)
      .toBe("2 errores en 3 decisiones a lo largo de 2 manos; 1 en manos que ganaste.");
    expect(screen.getByTestId("mistakes-filter-all").textContent).toBe("Todos (2)");
    expect(screen.getByTestId("mistakes-filter-call").textContent).toBe("Igualada errónea (1)");
    expect(screen.getByTestId("mistakes-filter-fold").textContent).toBe("No ir erróneo (1)");
    expect(screen.getByTestId("mistakes-hide-won").textContent).toBe("Ocultar manos ganadas (1)");
    expect(screen.getByTestId("home-btn").textContent).toBe("INICIO");
    expect(screen.getByTestId("logout-btn").textContent).toBe("CERRAR SESIÓN");
  });

  it("writes each card in Spanish, the coach's reason from its code", async () => {
    await renderSpanish();
    const card = screen.getByTestId("mistake-4-preflop");
    for (const text of ["GANADA", "Mano #4", "Nivel 2 (150/300)", "ICM MUY ALTA", "Stack 12,5 BB · 45.000 para igualar",
      "Tú: IGUALAR", "Coach: NO IR", "J7o no está en el rango de apertura de CO."]) {
      expect(card.textContent).toContain(text);
    }
  });

  it("shows a reason saved before the codes as it was saved", async () => {
    await renderSpanish();
    const card = screen.getByTestId("mistake-5-preflop");
    expect(card.textContent).toContain("Saved before the codes.");
    expect(card.textContent).toContain("Coach: ALL-IN");
  });
});
