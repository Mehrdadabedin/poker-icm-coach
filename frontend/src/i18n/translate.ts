import type { Lang } from "./lang";
import { en, type MessageKey, type Messages } from "./messages/en";
import { es } from "./messages/es";

export const MESSAGES: Record<Lang, Messages> = { en, es };

export type Params = Record<string, string | number>;

/** The text for a key in a language, with {name} placeholders filled in. */
export function translate(lang: Lang, key: MessageKey, params?: Params): string {
  const text = MESSAGES[lang][key] ?? en[key];
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (whole, name: string) => (name in params ? String(params[name]) : whole));
}
