/* English, the source language (plan 093). Every key the site translates is
 * in en/, one file per area so each stays under the 200-line limit; es/ must
 * have the same keys (TypeScript) and the same {placeholders} (the tests). */
import { auth } from "./en/auth";
import { landing } from "./en/landing";
import { table } from "./en/table";
import { review } from "./en/review";
import { home } from "./en/home";
import { coach } from "./en/coach";
import { hands } from "./en/hands";
import { mistakes } from "./en/mistakes";
import { handHistory } from "./en/handHistory";

export const en = { ...auth, ...landing, ...table, ...review, ...home, ...coach, ...hands, ...mistakes, ...handHistory };

export type MessageKey = keyof typeof en;
export type Messages = Record<MessageKey, string>;
