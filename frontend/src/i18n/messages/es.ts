/* Spanish, neutral for Spain and Latin America (plan 093). A first draft: a
 * native speaker who plays poker reviews it before Spanish is READY. */
import type { Messages } from "./en";
import { auth } from "./es/auth";
import { landing } from "./es/landing";
import { table } from "./es/table";
import { review } from "./es/review";
import { home } from "./es/home";
import { coach } from "./es/coach";
import { hands } from "./es/hands";
import { mistakes } from "./es/mistakes";
import { handHistory } from "./es/handHistory";
import { report } from "./es/report";
import { tools } from "./es/tools";
import { practice } from "./es/practice";

export const es: Messages = { ...auth, ...landing, ...table, ...review, ...home, ...coach, ...hands, ...mistakes, ...handHistory, ...report, ...tools, ...practice };
