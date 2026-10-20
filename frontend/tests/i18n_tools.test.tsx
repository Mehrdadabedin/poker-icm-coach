/* Session statistics and the ICM calculator in Spanish (plan 093 step 5d). */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { I18nProvider } from "../src/i18n/I18n";
import { setCurrentLang } from "../src/i18n/lang";
import { IcmCalculatorPage } from "../src/pages/IcmCalculatorPage";
import { StatisticsPage } from "../src/pages/StatisticsPage";

const { icmEquities, request } = vi.hoisted(() => ({ icmEquities: vi.fn(), request: vi.fn() }));
vi.mock("../src/services/icmApi", () => ({ icmEquities }));
vi.mock("../src/services/api", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  request,
}));

const spanish = (page: JSX.Element) => render(<I18nProvider initial="es"><MemoryRouter>{page}</MemoryRouter></I18nProvider>);

afterEach(() => {
  cleanup();
  setCurrentLang("en");
  vi.clearAllMocks();
});

describe("the ICM calculator in Spanish", () => {
  it("labels the form and writes the results with Spanish decimals", async () => {
    icmEquities.mockResolvedValue({ equities: [0.3766, 0.3316, 0.2918], method: "exact" });
    spanish(<IcmCalculatorPage />);
    expect(screen.getByText("CALCULADORA ICM")).toBeInTheDocument();
    expect(screen.getByText("Premio total (EUR):")).toBeInTheDocument();
    expect(screen.getByText("Puesto 1:")).toBeInTheDocument();
    expect(screen.getByTestId("add-player-btn").textContent).toBe("Añadir jugador");
    fireEvent.click(screen.getByTestId("calculate-btn"));
    await waitFor(() => expect(screen.getByTestId("icm-results-table")).toBeInTheDocument());
    expect(screen.getByRole("columnheader", { name: "Valor en premio" })).toBeInTheDocument();
    expect(screen.getByTestId("icm-row-1").textContent).toBe("145.00047,37%37,66%376,60 EUR-9,71%");
    expect(screen.getByText(/^La equity ICM es la parte justa/)).toBeInTheDocument();
  });

  it("explains a wrong form in Spanish", () => {
    spanish(<IcmCalculatorPage />);
    fireEvent.change(screen.getByTestId("payout-input-0"), { target: { value: "90" } });
    fireEvent.click(screen.getByTestId("calculate-btn"));
    expect(screen.getByTestId("error-message").textContent).toBe("Los porcentajes de premio no pueden superar el 100%");
    expect(icmEquities).not.toHaveBeenCalled();
  });
});

describe("session statistics in Spanish", () => {
  it("names every card in Spanish", async () => {
    request.mockResolvedValue({ handsPlayed: 12, handsWon: 5, vpip: 0.255, pfr: 0.1, aggression: 0.5, averagePot: 12500,
      bbWonLost: 1.5, chipProfit: 45000, coachAgreement: 0.8, icmMistakes: 2, positionPerformance: { BTN: 1200 } });
    spanish(<StatisticsPage />);
    expect(screen.getByText("Escribe el id de una mesa para cargar sus estadísticas.")).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("id de la mesa"), { target: { value: "T1" } });
    await waitFor(() => expect(screen.getByText("RESULTADO POR POSICIÓN")).toBeInTheDocument());
    for (const text of ["ESTADÍSTICAS DE LA SESIÓN", "MANOS", "25,5%", "BOTE MEDIO", "12.500", "1,50", "+45.000",
      "ACUERDO CON EL COACH", "+1200"]) {
      expect(screen.getByText(text)).toBeInTheDocument();
    }
  });
});
