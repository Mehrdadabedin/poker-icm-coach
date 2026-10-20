/* The ICM Coach tool and the tournament settings in Spanish (plan 093). */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { I18nProvider } from "../src/i18n/I18n";
import { setCurrentLang } from "../src/i18n/lang";
import { CoachPage } from "../src/pages/CoachPage";
import { SettingsPage } from "../src/pages/SettingsPage";

const { request } = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("../src/services/api", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  request,
}));

const ADVICE = {
  recommendedAction: "CALL", confidence: 0.72, reasoning: "AKo equity ~55% clears pot odds 25%.",
  reasonCode: "call_clears", reasonParams: { hand: "AKo", eq: "55%", odds: "25%" },
  alternativeAction: "FOLD", detail: { POSITION: "BTN", "CHIP EV": "POSITIVE EV (+12,500)" },
  ev: { winProb: 0.552, loseProb: 0.448, pot: 45000, toCall: 12500, chipEv: 12500, evClass: "POSITIVE EV", chipRecommendation: "CALL" },
  outs: { outs: 9, unknown: 47, improveTurn: 0.191, improveRiver: 0.35, winProb: 0.552, method: "exact" },
  education: "",
};

const SETTINGS = { startingStack: 45000, startingSmallBlind: 100, startingBigBlind: 200, blindLevelMinutes: 20,
  fastMode: false, showActionLabels: true, showResultLabels: true, cardBack: "blue" };

const spanish = (page: JSX.Element) => render(<I18nProvider initial="es"><MemoryRouter>{page}</MemoryRouter></I18nProvider>);

afterEach(() => {
  cleanup();
  setCurrentLang("en");
  vi.clearAllMocks();
});

describe("the ICM Coach tool in Spanish", () => {
  it("labels the form in Spanish", () => {
    request.mockResolvedValue({ hands: [] });
    spanish(<CoachPage />);
    expect(screen.getByText("COACH ICM")).toBeInTheDocument();
    expect(screen.getByText("MANO INICIAL (169 CLASES)")).toBeInTheDocument();
    expect(screen.getByText("Combinación representativa de AA: A♠ K♥")).toBeInTheDocument();
    for (const label of ["POSICIÓN", "RIVALES", "BOTE", "PARA IGUALAR", "CIEGA PEQUEÑA", "CIEGA GRANDE", "AÑADIR CARTA"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    expect(screen.getByTestId("analyze-btn").textContent).toBe("ANALIZAR");
    expect(screen.getByText("MESA · PREFLOP")).toBeInTheDocument();
    expect(screen.getByTestId("add-card-rank").textContent).toMatch(/^Valor/);
    fireEvent.click(screen.getByText("CARTAS EXACTAS"));
    expect(screen.getByText("CARTA 1")).toBeInTheDocument();
    expect(screen.getByTestId("card-2-suit").textContent).toMatch(/^Palo/);
  });

  it("asks for a whole street in Spanish", () => {
    request.mockResolvedValue({ hands: [] });
    spanish(<CoachPage />);
    fireEvent.change(screen.getByTestId("add-card-rank"), { target: { value: "2" } });
    fireEvent.change(screen.getByTestId("add-card-suit"), { target: { value: "c" } });
    expect(screen.getByText("MESA · INCOMPLETA")).toBeInTheDocument();
    expect(screen.getByText("Pon 0, 3, 4 o 5 cartas en la mesa antes de analizar.")).toBeInTheDocument();
  });

  it("writes the answer in Spanish with Spanish numbers", async () => {
    request.mockImplementation(async (path: string) => (path === "/api/coach/advice" ? ADVICE : { hands: [] }));
    spanish(<CoachPage />);
    fireEvent.click(screen.getByTestId("analyze-btn"));
    await waitFor(() => expect(screen.getByTestId("advice-panel")).toBeInTheDocument());
    expect(screen.getByText("RECOMENDACIÓN: IGUALAR")).toBeInTheDocument();
    expect(screen.getByText("Confianza 72%")).toBeInTheDocument();
    const ev = screen.getByTestId("ev-panel").textContent;
    expect(ev).toContain("EV EN FICHAS: +12.500");
    expect(ev).toContain("CLASE: EV POSITIVO");
    expect(ev).toContain("PROB. DE GANAR: 55,2%");
    expect(ev).toContain("BOTE: 45.000");
    expect(ev).toContain("RECOMENDACIÓN POR FICHAS: IGUALAR");
    expect(ev).toContain("TORNEO/ICM: IGUALAR");
    expect(screen.getByTestId("outs-panel").textContent)
      .toBe("OUTS: 9 / 47 desconocidasMEJORA EN EL TURN: 19,1%MEJORA HASTA EL RIVER: 35,0%PROBABILIDAD DE GANAR: 55,2% (exacta)");
    expect(screen.getByText("La equity de AKo (~55%) supera las pot odds (25%).")).toBeInTheDocument();
    const rows = [...screen.getByTestId("advice-panel").querySelectorAll(".coach-row")].map((r) => r.textContent);
    expect(rows).toEqual(["POSICIÓNBTN", "EV EN FICHASEV POSITIVO (+12.500)"]);
  });
});

describe("the tournament settings in Spanish", () => {
  it("labels every setting and the save note in Spanish", async () => {
    request.mockResolvedValue(SETTINGS);
    spanish(<SettingsPage />);
    expect(screen.getByText("Cargando ajustes…")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId("settings-save")).toBeInTheDocument());
    expect(screen.getByText("AJUSTES DEL TORNEO")).toBeInTheDocument();
    for (const label of ["STACK INICIAL", "CIEGA PEQUEÑA INICIAL", "CIEGA GRANDE INICIAL", "DURACIÓN DE CADA NIVEL (MINUTOS)",
      "MODO RÁPIDO", "MOSTRAR TEXTO EN LOS BOTONES DE ACCIÓN", "MOSTRAR ETIQUETAS DE RESULTADO", "REVERSO DE LAS CARTAS"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    expect(screen.getByTestId("settings-card-back").textContent).toBe("AzulRojo");
    expect(screen.getByText(/^Premios: 40\/25\/15\/10\/6\/4\./)).toBeInTheDocument();
    expect(screen.getByText("Valores por defecto; pulsa GUARDAR para aplicarlos.")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("settings-save"));
    expect(await screen.findByText("Guardado: la próxima sesión de práctica usa estos valores.")).toBeInTheDocument();
    expect(screen.getByTestId("settings-save").textContent).toBe("GUARDAR AJUSTES");
  });
});
