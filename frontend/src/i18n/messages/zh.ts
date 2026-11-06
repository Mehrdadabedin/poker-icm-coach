/* Simplified Chinese (plan 113). English under each area not yet translated; a community
 * poker player reviews it before zh is READY. Words follow TERMS_zh_fa.md. */
import { en, type Messages } from "./en";
import { auth } from "./zh/auth";
import { landing } from "./zh/landing";
import { tabs } from "./zh/tabs";
import { theme } from "./zh/theme";
import { home } from "./zh/home";
import { plans } from "./zh/plans";
import { portrait } from "./zh/portrait";
import { portraitPrompt } from "./zh/portraitPrompt";
import { profile } from "./zh/profile";
import { table } from "./zh/table";
import { tableStrip } from "./zh/tableStrip";
import { coach } from "./zh/coach";
import { a11y } from "./zh/a11y";
import { speak } from "./zh/speak";
import { review } from "./zh/review";
import { hands } from "./zh/hands";

export const zh: Messages = { ...en, ...auth, ...landing, ...tabs, ...theme, ...home, ...plans, ...portrait, ...portraitPrompt, ...profile,
  ...table, ...tableStrip, ...coach, ...a11y, ...speak, ...review, ...hands };
