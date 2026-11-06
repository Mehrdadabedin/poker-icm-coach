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

export const zh: Messages = { ...en, ...auth, ...landing, ...tabs, ...theme, ...home, ...plans, ...portrait, ...portraitPrompt, ...profile };
