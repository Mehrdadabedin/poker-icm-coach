/* Persian: the leaderboard (plan 113). */
import type { leaderboard as en } from "../en/leaderboard";

export const leaderboard: Record<keyof typeof en, string> = {
  "leaderboard.title": "جدول رده‌بندی",
  "leaderboard.back": "بازگشت به خانه",
  "leaderboard.top": "۱۰۰ نفر برتر",
  "leaderboard.week": "این هفته",
  "leaderboard.all": "همهٔ زمان‌ها",
  "leaderboard.dates": "{from} تا {to} (UTC)",
  "leaderboard.updated": "{n} دقیقه پیش به‌روز شد",
  "leaderboard.updatedNow": "همین الان به‌روز شد",
  "leaderboard.stats": "{wins} · {played}",
  "leaderboard.wins.one": "{n} برد",
  "leaderboard.wins.other": "{n} برد",
  "leaderboard.played.one": "{n} بازی",
  "leaderboard.played.other": "{n} بازی",
  "leaderboard.points.one": "{n} امتیاز",
  "leaderboard.points.other": "{n} امتیاز",
  "leaderboard.you": "تو، {name}",
  "leaderboard.noProfile": "برای آمدن در جدول پروفایلت را بساز",
  "leaderboard.empty.week": "این هفته هنوز تورنمنت تمام‌شده‌ای نیست.",
  "leaderboard.empty.all": "هنوز تورنمنت تمام‌شده‌ای نیست.",
  "leaderboard.error": "جدول رده‌بندی بارگیری نشد.",
};
