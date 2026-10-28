/* The light or dark look (plan 103): kept on this device, never on the server
 * (/api/settings is lost on every deploy). index.html applies the same choice
 * before the first paint so the app never flashes the wrong theme. */
export type ThemeChoice = "dark" | "light" | "system";
export type Theme = "dark" | "light";

export const THEME_KEY = "icmbot.theme";
export const CHOICES: ThemeChoice[] = ["dark", "light", "system"];
/** the header band's colour: the Android status bar follows it in both themes */
const BAND = "#07080a";

const isChoice = (value: string | null): value is ThemeChoice => CHOICES.includes(value as ThemeChoice);

export function getThemeChoice(): ThemeChoice {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    return isChoice(saved) ? saved : "system";
  } catch {
    return "system"; // blocked storage
  }
}

export function saveThemeChoice(choice: ThemeChoice): void {
  try {
    localStorage.setItem(THEME_KEY, choice);
  } catch {
    // blocked storage: the choice lasts until the page closes
  }
}

const phoneIsDark = (): boolean => window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? true;

export const resolveTheme = (choice: ThemeChoice, dark: boolean = phoneIsDark()): Theme =>
  (choice === "system" ? (dark ? "dark" : "light") : choice);

export function applyTheme(choice: ThemeChoice): Theme {
  const theme = resolveTheme(choice);
  document.documentElement.dataset.theme = theme;
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "theme-color";
    document.head.appendChild(meta);
  }
  meta.content = BAND;
  return theme;
}

/** Applies the saved choice and follows the phone's dark mode while the choice is "system". */
export function initTheme(): void {
  applyTheme(getThemeChoice());
  window.matchMedia?.("(prefers-color-scheme: dark)").addEventListener?.("change", () => {
    if (getThemeChoice() === "system") applyTheme("system");
  });
}

export function setThemeChoice(choice: ThemeChoice): void {
  saveThemeChoice(choice);
  applyTheme(choice);
}
