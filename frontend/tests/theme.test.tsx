/* The light and dark theme (plan 103): the picker, the saved choice, the phone's setting and the colours. */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { AppearancePicker } from "../src/components/AppearancePicker";
import { I18nProvider } from "../src/i18n/I18n";
import type { Lang } from "../src/i18n/lang";
import { getThemeChoice, initTheme, setThemeChoice, THEME_KEY } from "../src/services/theme";

let phoneDark = true;
let onPhoneChange: (() => void) | null = null;

beforeEach(() => {
  localStorage.clear();
  phoneDark = true;
  onPhoneChange = null;
  document.documentElement.removeAttribute("data-theme");
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query.includes("dark") ? phoneDark : !phoneDark,
    addEventListener: (_: string, listener: () => void) => { onPhoneChange = listener; },
    removeEventListener: () => undefined,
  }));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const theme = () => document.documentElement.dataset.theme;
const picker = (lang: Lang = "en") => render(<I18nProvider initial={lang}><AppearancePicker /></I18nProvider>);

describe("the appearance picker", () => {
  it.each([
    ["en", ["Dark", "Light", "Same as my phone"], "APPEARANCE"],
    ["es", ["Oscuro", "Claro", "Igual que el teléfono"], "APARIENCIA"],
  ] as const)("shows three options in %s, 'same as my phone' marked by default", (lang, names, title) => {
    picker(lang);
    expect(screen.getByText(title)).toBeInTheDocument();
    const options = screen.getAllByRole("radio");
    expect(options.map((o) => o.textContent)).toEqual([...names]);
    expect(options.map((o) => o.getAttribute("aria-checked"))).toEqual(["false", "false", "true"]);
  });

  it("a choice sets data-theme on <html> and is kept after a reload", () => {
    picker();
    fireEvent.click(screen.getByTestId("theme-light"));
    expect(theme()).toBe("light");
    expect(screen.getByTestId("theme-light")).toHaveAttribute("aria-checked", "true");
    expect(localStorage.getItem(THEME_KEY)).toBe("light");
    cleanup();
    document.documentElement.removeAttribute("data-theme");
    initTheme(); // what main.tsx does on the next load
    expect(theme()).toBe("light");
    picker();
    expect(screen.getByTestId("theme-light")).toHaveAttribute("aria-checked", "true");
  });
});

describe("same as my phone", () => {
  it("follows prefers-color-scheme, and changes when the phone does", () => {
    initTheme();
    expect(theme()).toBe("dark");
    phoneDark = false;
    onPhoneChange?.();
    expect(theme()).toBe("light");
  });

  it("stops following the phone once a theme is chosen", () => {
    initTheme();
    setThemeChoice("dark");
    phoneDark = false;
    onPhoneChange?.();
    expect(theme()).toBe("dark");
  });

  it("falls back to the phone's setting when storage is blocked, without an error", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
    expect(getThemeChoice()).toBe("system");
    expect(() => setThemeChoice("light")).not.toThrow();
    expect(theme()).toBe("light");
  });
});

const STYLES = "src/styles";
const strip = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, "").replace(/@import[^;]*;/g, "");
const sheets = () => readdirSync(STYLES).filter((f) => f.endsWith(".css") && f !== "tokens.css");
const tokenFiles = () => ["tokens.css", ...readdirSync(`${STYLES}/tokens`).map((f) => `tokens/${f}`)];

describe("colours", () => {
  it("no stylesheet has a hex colour outside the token files", () => {
    const offenders = sheets()
      .map((file) => [file, strip(readFileSync(`${STYLES}/${file}`, "utf8")).match(/#[0-9a-fA-F]{3,8}\b/g)] as const)
      .filter(([, hits]) => hits)
      .map(([file, hits]) => `${file}: ${hits?.slice(0, 3).join(" ")}`);
    expect(offenders).toEqual([]);
  });
});

type Rgba = [number, number, number, number];
type TokenMap = Record<string, string>;

/** Every token of a theme: dark is the base, light overrides it (fixed tokens stay), var() chains resolved. */
function loadTokens(mode: "dark" | "light"): TokenMap {
  const dark: TokenMap = {};
  const light: TokenMap = {};
  for (const file of tokenFiles()) {
    for (const [, selector, body] of strip(readFileSync(`${STYLES}/${file}`, "utf8")).matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const target = selector.includes('data-theme="light"') ? light : dark;
      for (const [, name, value] of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) target[name] = value.trim();
    }
  }
  const all = mode === "light" ? { ...dark, ...light } : dark;
  const resolve = (value: string, depth = 0): string =>
    value.replace(/var\((--[\w-]+)\)/g, (whole, name: string) => (all[name] && depth < 8 ? resolve(all[name], depth + 1) : whole));
  return Object.fromEntries(Object.entries(all).map(([name, value]) => [name, resolve(value)]));
}

function parseColour(value: string): Rgba {
  const hex = value.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    const full = hex[1].length === 3 ? [...hex[1]].map((c) => c + c).join("") : hex[1];
    return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255).concat(1) as Rgba;
  }
  const fn = value.match(/rgba?\(([^)]*)\)/);
  if (!fn) throw new Error(`not a colour: ${value}`);
  const [r, g, b, a = "1"] = fn[1].split(/[,\s/]+/).filter(Boolean);
  return [Number(r) / 255, Number(g) / 255, Number(b) / 255, Number(a)];
}

const blend = (top: Rgba, under: Rgba): Rgba => [0, 1, 2].map((i) => top[i] * top[3] + under[i] * (1 - top[3])).concat(1) as Rgba;
const luminance = (c: Rgba) => {
  const [r, g, b] = c.slice(0, 3).map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
function ratio(tokens: TokenMap, fg: string, bg: string, under: string): number {
  const page = parseColour(tokens[under]);
  const back = blend(parseColour(tokens[bg]), page);
  const [hi, lo] = [luminance(blend(parseColour(tokens[fg]), back)), luminance(back)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// text on its background; a see-through background is laid over --surface (or the third name)
const PAIRS: [string, string, string?][] = [
  ["--text", "--bg"], ["--text", "--surface"], ["--text-muted", "--bg"], ["--text-muted", "--surface"],
  ["--accent", "--bg"], ["--accent", "--surface"], ["--tab-idle", "--tab-bar"], ["--accent", "--tab-bar"],
  ["--body-text", "--bg"], ["--muted", "--bg"], ["--accent-ink", "--accent-fill"],
  // badges and chips
  ["--portrait-pending-ink", "--portrait-pending-bg"], ["--coach-chip-ink", "--coach-chip-bg"],
  ["--coach-good-ink", "--coach-good-bg"], ["--coach-bubble-text", "--coach-bubble-bg"],
  ["--coach-bubble-muted", "--coach-bubble-bg"], ["--review-good-text", "--review-good-badge-bg"],
  ["--glossary-mark-ink", "--glossary-badge-bg"],
  // coach colours as text
  ["--coach-pos", "--surface"], ["--coach-neg", "--surface"], ["--coach-fold-text", "--surface"],
  ["--coach-raise", "--surface"], ["--coach-raise-soft", "--surface"], ["--coach-street", "--surface"],
  ["--coach-allin-text", "--surface"], ["--coach-raise", "--coach-bubble-bg"],
  // admin
  ["--admin-info-ink", "--admin-info-bg"], ["--admin-ok-ink", "--admin-ok-bg"], ["--admin-warn-ink", "--admin-warn-bg"],
  ["--admin-error-ink", "--admin-denied-bg"], ["--admin-danger-ink", "--admin-danger-box-bg"],
  ["--admin-protected-ink", "--admin-panel-bg", "--bg"], ["--text", "--admin-notice-bg"],
  // charts and review pages
  ["--report-axis-text", "--surface"], ["--report-good", "--surface"], ["--review-good-label", "--surface"],
  ["--review-lost-label", "--surface"], ["--review-paused-text", "--bg"],
  ["--review-won-title", "--review-won-top"], ["--review-won-title", "--review-won-bottom"],
  ["--review-lost-title", "--review-lost-top"], ["--review-lost-title", "--review-lost-bottom"],
  ["--range-raise-ink", "--range-raise-bg"], ["--range-call-ink", "--range-call-bg"],
  ["--range-3bet-ink", "--range-3bet-bg"], ["--range-jam-ink", "--range-jam-bg"],
  // errors
  ["--icm-error-text", "--icm-error-bg"], ["--signin-error", "--signin-error-bg"], ["--bot-error-ink", "--surface"],
  ["--account-error", "--account-card-bg"], ["--glossary-gold", "--surface"],
  ["--account-card-text", "--account-card-bg"], ["--account-primary-ink", "--account-primary-bg"],
  ["--header-play-ink", "--header-play-bg"],
  ["--landing-min-text", "--landing-min-bg"], ["--review-primary-ink", "--review-primary-bg"],
  ["--signin-submit-ink", "--signin-submit-bg"], ["--signin-provider-dark-ink", "--signin-provider-dark-bg"],
  ["--signin-provider-light-ink", "--signin-provider-light-bg"], ["--dealer-ink", "--dealer-bg"],
  ["--explain-note-ink", "--explain-note-bg"], ["--lock-title", "--surface"], ["--lock-text", "--surface"], ["--lock-open-ink", "--surface"], ["--text", "--upgrade-bg"],
  ["--accent", "--upgrade-bg"], ["--sheet-soon-ink", "--sheet-soon-bg"], ["--lb-points", "--surface"], ["--lb-points", "--bg"], ["--accent-ink", "--lb-silver"], ["--accent-ink", "--lb-bronze"],
  ["--table-label", "--surface"], ["--table-label", "--bg"], ["--panel-title", "--surface"], ["--panel-title", "--bg"],
];

describe("contrast", () => {
  it.each(["dark", "light"] as const)("every text and background pair is at least 4.5:1 in %s", (mode) => {
    const tokens = loadTokens(mode);
    const missing = PAIRS.flat().filter((name): name is string => !!name && name.startsWith("--") && !tokens[name]);
    expect(missing).toEqual([]);
    const low = PAIRS
      .map(([fg, bg, under = "--surface"]) => [fg, bg, Number(ratio(tokens, fg, bg, under).toFixed(2))] as const)
      .filter(([, , value]) => value < 4.5);
    expect(low).toEqual([]);
  });

  it("every -ink or -text token with a -bg twin is in the list", () => {
    const names = Object.keys(loadTokens("dark"));
    const twins = names
      .filter((name) => /-(ink|text)$/.test(name) && names.includes(name.replace(/-(ink|text)$/, "-bg")))
      .filter((name) => !PAIRS.some(([fg, bg]) => fg === name && bg === name.replace(/-(ink|text)$/, "-bg")));
    expect(twins).toEqual([]);
  });
});
