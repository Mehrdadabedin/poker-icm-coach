/* Simplified Chinese: the leaderboard (plan 113). */
import type { leaderboard as en } from "../en/leaderboard";

export const leaderboard: Record<keyof typeof en, string> = {
  "leaderboard.title": "排行榜",
  "leaderboard.back": "返回首页",
  "leaderboard.top": "前 100 名",
  "leaderboard.week": "本周",
  "leaderboard.all": "全部时间",
  "leaderboard.dates": "{from} 至 {to}（UTC）",
  "leaderboard.updated": "{n} 分钟前更新",
  "leaderboard.updatedNow": "刚刚更新",
  "leaderboard.stats": "{wins} · {played}",
  "leaderboard.wins.one": "{n} 次冠军",
  "leaderboard.wins.other": "{n} 次冠军",
  "leaderboard.played.one": "{n} 场",
  "leaderboard.played.other": "{n} 场",
  "leaderboard.points.one": "{n} 分",
  "leaderboard.points.other": "{n} 分",
  "leaderboard.you": "你，{name}",
  "leaderboard.noProfile": "创建个人资料即可上榜",
  "leaderboard.empty.week": "本周还没有已完成的锦标赛。",
  "leaderboard.empty.all": "还没有已完成的锦标赛。",
  "leaderboard.error": "无法加载排行榜。",
};
