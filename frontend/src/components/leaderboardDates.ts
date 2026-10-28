import type { Lang } from "../i18n/lang";
import type { MessageKey } from "../i18n/messages/en";

export const weekDates = (board: { weekStart: string; weekEnd: string }, lang: Lang, t: (key: MessageKey, params?: Record<string, string>) => string): string => {
  const day = new Intl.DateTimeFormat(lang === "en" ? "en-GB" : lang, { day: "numeric", month: "short", timeZone: "UTC" });
  return t("leaderboard.dates", { from: day.format(new Date(board.weekStart)), to: day.format(new Date(board.weekEnd)) });
};

export const minutesAgo = (updatedAt: string, now = Date.now()): number =>
  Math.max(0, Math.floor((now - new Date(updatedAt).getTime()) / 60000));
