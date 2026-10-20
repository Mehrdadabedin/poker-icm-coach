/* The language system (plan 093): English and Spanish (icmbot.es); Chinese
 * comes later. Step 1 translates the sign-in screen; a language reaches
 * visitors only once it is READY, until then it is previewed with ?lang=es. */
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { LanguageMenu } from "../src/components/LanguageMenu";
import { LoginForm } from "../src/components/LoginForm";
import { I18nProvider } from "../src/i18n/I18n";
import { detectLang, LANG_KEY, READY, type Lang, type LangSources } from "../src/i18n/lang";
import { en } from "../src/i18n/messages/en";
import { MESSAGES } from "../src/i18n/translate";

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
        expect(messages[key].trim(), `${lang} ${key}`).not.toBe("");
      }
    }
  });
});

function signIn(lang: Lang) {
  render(<I18nProvider initial={lang}><MemoryRouter><LoginForm onLogin={() => undefined} /><LanguageMenu /></MemoryRouter></I18nProvider>);
}

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
