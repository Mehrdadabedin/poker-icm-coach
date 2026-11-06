import { htmlDir, type Lang } from "./lang";
import { en, type MessageKey, type Messages } from "./messages/en";
import { es } from "./messages/es";
import { fa } from "./messages/fa";
import { zh } from "./messages/zh";

export const MESSAGES: Record<Lang, Messages> = { en, es, zh, fa };

export type Params = Record<string, string | number>;

// First-strong isolate and pop (U+2068, U+2069): invisible, and screen readers skip them.
const FSI = "\u2068";
const PDI = "\u2069";

/** The text for a key in a language, with {name} placeholders filled in. In a
 * right-to-left language each value is isolated, so a Latin name or "2,400"
 * inside a Persian sentence stays where the sentence puts it (plan 113). */
export function translate(lang: Lang, key: MessageKey, params?: Params): string {
  const text = MESSAGES[lang][key] ?? en[key];
  if (!params) return text;
  const fill = htmlDir(lang) === "rtl" ? (v: string) => `${FSI}${v}${PDI}` : (v: string) => v;
  return text.replace(/\{(\w+)\}/g, (whole, name: string) => (name in params ? fill(String(params[name])) : whole));
}
