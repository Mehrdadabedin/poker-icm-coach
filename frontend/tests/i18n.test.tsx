/* The language system (plan 093): English and Spanish (icmbot.es); Chinese
 * comes later. Step 1 translates the sign-in screen; a language reaches
 * visitors only once it is READY, until then it is previewed with ?lang=es. */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { LanguageMenu } from "../src/components/LanguageMenu";
import { LoginForm } from "../src/components/LoginForm";
import { I18nProvider } from "../src/i18n/I18n";
import { detectLang, LANG_KEY, offeredLangs, READY, type Lang, type LangSources } from "../src/i18n/lang";
import { en } from "../src/i18n/messages/en";
import { MESSAGES } from "../src/i18n/translate";

// the cookie banner only shows where Google Analytics is set up, as on icmbot.es
vi.mock("../src/analytics", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  isGoogleAnalyticsConfigured: () => true,
}));

const holes = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

const src = (over: Partial<LangSources> = {}): LangSources =>
  ({ search: "", saved: null, host: "icmbot.one", browser: ["en-GB"], ...over });

afterEach(() => {
  cleanup();
  localStorage.clear();
  document.documentElement.lang = "";
});

describe("which language the site speaks", () => {
  it("takes ?lang= first, then the saved choice, then English", () => {
    expect(detectLang(src({ search: "?lang=es", saved: "en" }))).toBe("es");
    expect(detectLang(src({ saved: "es" }))).toBe("es");
    expect(detectLang(src({ search: "?lang=fr", saved: "xx" }))).toBe("en");
  });

  it("speaks Spanish on icmbot.es from the start, unless the visitor chose English", () => {
    expect(detectLang(src({ host: "icmbot.es" }))).toBe("es");
    expect(detectLang(src({ host: "www.icmbot.es", browser: ["en-US"] }))).toBe("es");
    expect(detectLang(src({ host: "icmbot.es", saved: "en" }))).toBe("en");
  });

  it("follows the browser on icmbot.one only once Spanish is ready", () => {
    expect(READY).toEqual(["en"]);
    expect(detectLang(src({ browser: ["es-ES"] }))).toBe("en"); // nobody meets a half-translated site
    expect(detectLang(src({ browser: ["es-MX", "en"] }), ["en", "es"])).toBe("es");
    expect(detectLang(src({ browser: ["zh-CN", "en"] }), ["en", "es"])).toBe("en"); // Chinese comes later
  });

  it("has every key in every language, with the same placeholders", () => {
    for (const [lang, messages] of Object.entries(MESSAGES)) {
      expect(Object.keys(messages).sort(), lang).toEqual(Object.keys(en).sort());
      for (const key of Object.keys(en) as (keyof typeof en)[]) {
        expect(holes(messages[key]), `${lang} ${key}`).toEqual(holes(en[key]));
        // empty only where English is: the hero puts words after its gold word in Spanish only
        if (en[key].trim()) expect(messages[key].trim(), `${lang} ${key}`).not.toBe("");
      }
    }
  });
});

function signIn(lang: Lang) {
  render(<I18nProvider initial={lang}><MemoryRouter><LoginForm onLogin={() => undefined} /><LanguageMenu /></MemoryRouter></I18nProvider>);
}

describe("the language buttons", () => {
  it("always offer Spanish on icmbot.es, so English is never a dead end (the owner, 20 Oct)", () => {
    expect(offeredLangs("en", "icmbot.es")).toEqual(["en", "es"]);
    expect(offeredLangs("es", "www.icmbot.es")).toEqual(["en", "es"]);
  });

  it("wait on icmbot.one until Spanish is ready, except while previewing it", () => {
    expect(offeredLangs("en", "icmbot.one")).toEqual(["en"]);
    expect(offeredLangs("es", "icmbot.one")).toEqual(["en", "es"]);
    expect(offeredLangs("en", "icmbot.one", ["en", "es"])).toEqual(["en", "es"]);
  });
});

describe("the landing page", () => {
  it("reads in Spanish, gold word and all, with a way back to English", async () => {
    const { App } = await import("../src/App");
    localStorage.setItem(LANG_KEY, "es");
    window.location.hash = "#/";
    render(<App />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Domina tus decisiones de torneo");
    expect(screen.getByRole("heading", { level: 1 }).querySelector(".lm-accent")).toHaveTextContent("decisiones");
    expect(screen.getByTestId("minimal-start")).toHaveTextContent("Empieza a entrenar gratis");
    expect(screen.getByTestId("minimal-login")).toHaveTextContent("Iniciar sesión");
    expect(screen.getByTestId("minimal-step-graded")).toHaveTextContent("Preferida, Aceptable o Subóptima");
    expect(screen.getByTestId("minimal-closing")).toHaveTextContent("Tu próximo torneo empieza aquí.");
    expect(screen.getByTestId("minimal-cookie-settings")).toHaveTextContent("Configuración de cookies");
    expect(screen.getByText("Tu privacidad importa")).toBeInTheDocument();
    // at the top of the page, in the header band, as EN / ES
    expect(screen.getByTestId("minimal-header")).toContainElement(screen.getByTestId("lang-en"));
    expect(screen.getByTestId("lang-es")).toHaveTextContent("ES");
    fireEvent.click(screen.getByTestId("lang-en"));
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Master tournament decisions");
  });
});

describe("the sign-in screen", () => {
  it("reads in Spanish", () => {
    signIn("es");
    expect(screen.getByTestId("auth-submit")).toHaveTextContent("Iniciar sesión");
    expect(screen.getByPlaceholderText("Correo o usuario")).toBeInTheDocument();
    expect(screen.getByText("¿No tienes una cuenta?")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("auth-submit"));
    expect(screen.getByText("El usuario es obligatorio.")).toBeInTheDocument();
    expect(document.documentElement.lang).toBe("es");
  });

  it("hides the menu while English is the only language ready", () => {
    signIn("en");
    expect(screen.queryByTestId("lang-menu")).toBeNull();
    expect(screen.getByTestId("auth-submit")).toHaveTextContent("Sign in");
  });

  it("lets someone previewing Spanish switch back to English, and remembers it", () => {
    signIn("es");
    expect(screen.getByTestId("lang-es")).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByTestId("lang-en"));
    expect(screen.getByTestId("auth-submit")).toHaveTextContent("Sign in");
    expect(localStorage.getItem(LANG_KEY)).toBe("en");
  });
});
