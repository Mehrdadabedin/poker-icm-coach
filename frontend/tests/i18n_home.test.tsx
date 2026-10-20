/* The home menu, the bot choice page and the sign-in callback in Spanish (plan
 * 093 step 3c). */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { I18nProvider } from "../src/i18n/I18n";
import { setCurrentLang } from "../src/i18n/lang";
import { AuthCallbackPage } from "../src/pages/AuthCallbackPage";
import { BotProfilesPage } from "../src/pages/BotProfilesPage";
import { HomePage } from "../src/pages/HomePage";

const { request } = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("../src/services/api", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  request,
  me: vi.fn(async () => ({ username: "Admin" })),
  adminSummary: vi.fn(async () => { throw new Error("API 403"); }),
}));

function inSpanish(path: string, element: JSX.Element) {
  return render(
    <I18nProvider initial="es">
      <MemoryRouter initialEntries={[path]}>
        <Routes><Route path={path.split("?")[0]} element={element} /></Routes>
      </MemoryRouter>
    </I18nProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("icm_auth_token", "t-1");
  localStorage.setItem("icm_username", "Admin");
  localStorage.setItem("icm_away_table", JSON.stringify({ tableId: "abc", label: "D" }));
  request.mockReset();
  request.mockResolvedValue({ tableId: "abc", status: "active", tableLabel: "D" });
});
afterEach(() => {
  cleanup();
  setCurrentLang("en");
});

describe("the signed-in pages in Spanish", () => {
  it("shows the home menu in Spanish, with the language buttons in its header", async () => {
    inSpanish("/", <HomePage />);
    await act(async () => undefined);
    expect(screen.getByText("Práctica de torneos de 9 jugadores con un coach ICM")).toBeInTheDocument();
    expect(screen.getByTestId("start-practice")).toHaveTextContent("Empezar a practicarElige 8 bots y juega un torneo");
    expect(screen.getByTestId("menu-mistakes")).toHaveTextContent("Mis errores");
    expect(screen.getByText("REPASAR")).toBeInTheDocument();
    expect(screen.getByTestId("session-bar")).toHaveTextContent("Jugando como Admin");
    expect(screen.getByTestId("logout-btn")).toHaveTextContent("CERRAR SESIÓN");
    expect(screen.getByTestId("session-bar")).toContainElement(screen.getByTestId("lang-es"));
  });

  it("offers Continue table with its label", async () => {
    inSpanish("/", <HomePage />);
    expect(await screen.findByTestId("continue-table")).toHaveTextContent("Seguir en la mesa D");
  });

  it("describes the bots in Spanish and asks for 8 rivals", () => {
    inSpanish("/bot-profiles", <BotProfilesPage />);
    expect(screen.getByText("PERFILES DE BOTS")).toBeInTheDocument();
    expect(screen.getByTestId("bot-profile-alex")).toHaveTextContent("Tight agresivo");
    expect(screen.getByTestId("bot-profile-emma")).toHaveTextContent("Le encanta ver flops");
    expect(screen.getByRole("button", { name: "Añadir a Sarah" })).toBeInTheDocument();
    expect(screen.getByTestId("bot-profiles-total")).toHaveTextContent("RIVALES 0 / 8");
    fireEvent.click(screen.getByTestId("bot-profile-add-david"));
    expect(screen.getByTestId("bot-profiles-summary")).toHaveTextContent("David — Tight pasivo × 1");
    fireEvent.click(screen.getByTestId("add-bots-to-table"));
    expect(screen.getByTestId("bot-profiles-error")).toHaveTextContent("Elige 8 rivales para completar el torneo.");
  });

  it("tells a suspended account in Spanish after Google sign-in", () => {
    inSpanish("/auth/callback?error=account_suspended", <AuthCallbackPage />);
    expect(screen.getByTestId("auth-callback-message")).toHaveTextContent("Esta cuenta está suspendida.");
  });
});
