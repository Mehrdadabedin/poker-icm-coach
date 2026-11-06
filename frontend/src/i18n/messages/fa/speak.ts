/* Persian: what the coach says aloud and its speaker chip (plan 113). */
import type { speak as en } from "../en/speak";

// The spoken lines end without a full stop: after a number a Persian voice reads it as نقطه
// (decimal point), so "کال ۱۶۰." came out as "one hundred sixty point" (the owner, 6 Nov).
export const speak: Record<keyof typeof en, string> = {
  "speak.chip": "صدای مربی",
  "speak.titleOn": "صدای مربی: روشن",
  "speak.titleOff": "صدای مربی: خاموش",
  "speak.on": "صدای مربی روشن شد.",
  "speak.fold": "فولد",
  "speak.check": "چک",
  "speak.call": "کال {amount}",
  "speak.callPlain": "کال",
  "speak.bet": "بت",
  "speak.raise": "ریز",
  "speak.threeBet": "تری‌بت",
  "speak.fourBet": "فوربت",
  "speak.allIn": "آل‌این",
};
