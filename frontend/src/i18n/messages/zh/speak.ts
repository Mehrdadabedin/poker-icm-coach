/* Simplified Chinese: what the coach says aloud and its speaker chip (plan 113). */
import type { speak as en } from "../en/speak";

export const speak: Record<keyof typeof en, string> = {
  "speak.chip": "教练语音",
  "speak.titleOn": "教练语音：开",
  "speak.titleOff": "教练语音：关",
  "speak.on": "教练语音已开启。",
  "speak.fold": "弃牌。",
  "speak.check": "过牌。",
  "speak.call": "跟注 {amount}。",
  "speak.callPlain": "跟注。",
  "speak.bet": "下注。",
  "speak.raise": "加注。",
  "speak.threeBet": "再加注。",
  "speak.fourBet": "四次加注。",
  "speak.allIn": "全下。",
};
