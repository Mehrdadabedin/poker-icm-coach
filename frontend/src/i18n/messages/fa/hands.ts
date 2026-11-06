/* Persian: hand names and the bots' reasons, by the server's codes (plan 113;
 * backend/app/services/hand_review.py and bot_texts.py). Ranks stay Latin (J, Q). */
import type { hands as en } from "../en/hands";

export const hands: Record<keyof typeof en, string> = {
  "hand.ten": "10",
  "hand.highCard": "های کارت {r}",
  "hand.pair": "جفت {r}",
  "hand.twoPair": "دو جفت، {r} و {s}",
  "hand.trips": "سه‌تایی {r}",
  "hand.straight": "استریت تا {r}",
  "hand.flush": "فلاش تا {r}",
  "hand.fullHouse": "فول‌هاوس، سه {r} و دو {s}",
  "hand.quads": "چهارتایی {r}",
  "hand.straightFlush": "استریت فلاش تا {r}",
  "hand.uncontested": "بدون رقیب (بقیه فولد کردند)",
  "bots.reason.fold": "فولد با {hand}: اکوییتی {eq} کمتر از پات آدز لازم {odds} از {pos} با فشار ICM {pressure} است.",
  "bots.reason.call_profitable": "کال با {hand}: اکوییتی {eq} در برابر پات آدز {odds} از {pos}؛ فشار ICM {pressure} (سودآور).",
  "bots.reason.call_marginal": "کال با {hand}: اکوییتی {eq} در برابر پات آدز {odds} از {pos}؛ فشار ICM {pressure} (مرزی).",
  "bots.reason.bet": "بت با {hand} از {pos}: اکوییتی {eq}، {bb} BB باقی‌مانده، پات آدز {odds}.",
  "bots.reason.check": "چک با {hand} از {pos}: اکوییتی {eq}، {bb} BB باقی‌مانده.",
  "bots.reason.all_in": "آل‌این با {hand} برای {bb} BB: اکوییتی {eq} با فشار ICM {pressure}.",
  "bots.faced.unopened": "باز نشده",
  "bots.faced.no_bet": "بدون بت",
  "bots.faced.raise_to": "ریز تا {amount}",
  "bots.faced.big_blind": "بیگ بلایند {amount}",
  "bots.faced.bet": "بت {amount}",
  "bots.pressure.LOW": "کم",
  "bots.pressure.MEDIUM": "متوسط",
  "bots.pressure.HIGH": "زیاد",
  "bots.pressure.VERY HIGH": "خیلی زیاد",
};
