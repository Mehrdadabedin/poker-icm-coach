import type { MessageKey } from "../i18n/messages/en";
import type { MenuIcon } from "./homeMenuIcons";

export interface Entry {
  to: string;
  icon: MenuIcon;
  title: MessageKey;
  text: MessageKey;
  testId: string;
  /** filled into the title, as the table label in "Continue table D" */
  label?: string;
}

export const STUDY: Entry[] = [
  { to: "/coach", icon: "coach", title: "home.coach.title", text: "home.coach.text", testId: "menu-coach" },
  { to: "/ranges", icon: "ranges", title: "home.ranges.title", text: "home.ranges.text", testId: "menu-ranges" },
  { to: "/icm-calculator", icon: "calculator", title: "home.calculator.title", text: "home.calculator.text", testId: "menu-icm-calculator" },
  { to: "/glossary", icon: "glossary", title: "home.glossary.title", text: "home.glossary.text", testId: "menu-glossary" },
];

export const REVIEW: Entry[] = [
  { to: "/mistakes", icon: "mistakes", title: "home.mistakes.title", text: "home.mistakes.text", testId: "menu-mistakes" },
  { to: "/history", icon: "history", title: "home.history.title", text: "home.history.text", testId: "menu-history" },
  { to: "/report", icon: "report", title: "home.report.title", text: "home.report.text", testId: "menu-report" },
];

export const SETUP: Entry[] = [
  { to: "/settings", icon: "settings", title: "home.settings.title", text: "home.settings.text", testId: "menu-settings" },
  { to: "/profile", icon: "portrait", title: "home.profile.title", text: "home.profile.text", testId: "menu-profile" },
];

export const ADMIN: Entry = { to: "/admin", icon: "admin", title: "home.admin.title", text: "home.admin.text", testId: "menu-admin" };

export const GROUPS: { label: MessageKey; entries: Entry[] }[] = [
  { label: "home.study", entries: STUDY },
  { label: "home.review", entries: REVIEW },
  { label: "home.setup", entries: SETUP },
];
