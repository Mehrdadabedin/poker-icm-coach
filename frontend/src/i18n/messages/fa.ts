/* Persian (plan 113). English under each area not yet translated; a community
 * poker player reviews it before fa is READY. Words follow TERMS_zh_fa.md. */
import { en, type Messages } from "./en";
import { auth } from "./fa/auth";
import { landing } from "./fa/landing";
import { tabs } from "./fa/tabs";
import { theme } from "./fa/theme";
import { home } from "./fa/home";
import { plans } from "./fa/plans";
import { portrait } from "./fa/portrait";
import { portraitPrompt } from "./fa/portraitPrompt";
import { profile } from "./fa/profile";
import { table } from "./fa/table";
import { tableStrip } from "./fa/tableStrip";
import { coach } from "./fa/coach";
import { a11y } from "./fa/a11y";
import { speak } from "./fa/speak";
import { review } from "./fa/review";
import { hands } from "./fa/hands";
import { mistakes } from "./fa/mistakes";
import { handHistory } from "./fa/handHistory";
import { report } from "./fa/report";
import { glossary } from "./fa/glossary";
import { glossaryTerms } from "./fa/glossaryTerms";
import { quiz } from "./fa/quiz";
import { practice } from "./fa/practice";
import { tools } from "./fa/tools";
import { leaderboard } from "./fa/leaderboard";

export const fa: Messages = { ...en, ...auth, ...landing, ...tabs, ...theme, ...home, ...plans, ...portrait, ...portraitPrompt, ...profile,
  ...table, ...tableStrip, ...coach, ...a11y, ...speak, ...review, ...hands,
  ...mistakes, ...handHistory, ...report, ...glossary, ...glossaryTerms, ...quiz, ...practice, ...tools, ...leaderboard };
