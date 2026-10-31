/* The landing footer leads to the Terms and the Privacy Policy, open without an account. */
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { MinimalFooter } from "../src/landing-minimal/MinimalFooter";
import { I18nProvider } from "../src/i18n/I18n";
import { en } from "../src/i18n/messages/en";
import { es } from "../src/i18n/messages/es";
import { AuthAccept } from "../src/components/AuthFooter";
import { LegalPage } from "../src/pages/LegalPage";

const site = (lang: "en" | "es", path: string) => render(
  <I18nProvider initial={lang}>
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/" element={<MinimalFooter />} />
        <Route path="/terms" element={<LegalPage doc="terms" />} />
        <Route path="/privacy" element={<LegalPage doc="privacy" />} />
      </Routes>
    </MemoryRouter>
  </I18nProvider>,
);

afterEach(cleanup);

describe("the legal pages", () => {
  it("the footer shows the copyright and opens the Terms", () => {
    site("en", "/");
    expect(screen.getByTestId("minimal-copyright")).toHaveTextContent("© 2026 ICMBOT. All rights reserved.");
    fireEvent.click(screen.getByTestId("minimal-terms"));
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Terms and Conditions");
    expect(screen.getByText("Practice only, no real money", { selector: "h2" })).toBeInTheDocument();
  });

  it("the footer opens the Privacy Policy", () => {
    site("en", "/");
    fireEvent.click(screen.getByTestId("minimal-privacy"));
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Privacy Policy");
  });

  it("reads in Spanish", () => {
    site("es", "/privacy");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Política de Privacidad");
    expect(screen.getByTestId("minimal-copyright")).toHaveTextContent("Todos los derechos reservados.");
  });

  it("shows every section, with no key left untranslated", () => {
    for (const [doc, count] of [["terms", 11], ["privacy", 9]] as const) {
      site("en", `/${doc}`);
      expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(count);
      expect(document.body.textContent).not.toContain("legal.");
      cleanup();
    }
  });

  it("names who runs it, with the address of each language", () => {
    site("en", "/privacy");
    expect(document.body).toHaveTextContent("ICMBOT is responsible for your personal data in ICMBOT. Contact: info@icmbot.one.");
    cleanup();
    site("es", "/terms");
    expect(document.body).toHaveTextContent("Se aplica la ley de España");
    expect(document.body).toHaveTextContent("Preguntas: info@icmbot.es.");
    expect(document.body.textContent).not.toContain("[OWNER");
  });

  it("the sign-up form names both, each in a new tab so the form stays filled", () => {
    render(<I18nProvider initial="es"><MemoryRouter><AuthAccept /></MemoryRouter></I18nProvider>);
    expect(screen.getByTestId("auth-accept")).toHaveTextContent("Al continuar, aceptas los Términos y Condiciones y la Política de Privacidad.");
    expect(screen.getByTestId("auth-terms")).toHaveAttribute("target", "_blank");
    expect(screen.getByTestId("auth-privacy")).toHaveAttribute("href", "/privacy");
  });

  it("no longer credits a person, and never says Nash", () => {
    const words = JSON.stringify([en, es]);
    expect(words).not.toMatch(/Created by|Creado por|Mehrdad/);
    expect(JSON.stringify([Object.entries(en).filter(([k]) => k.startsWith("legal."))])).not.toMatch(/Nash|—/);
  });
});
