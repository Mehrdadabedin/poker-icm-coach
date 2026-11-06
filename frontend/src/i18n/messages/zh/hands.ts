/* Simplified Chinese: hand names and the bots' reasons, by the server's codes (plan 113;
 * backend/app/services/hand_review.py and bot_texts.py). Ranks stay Latin (J, Q). */
import type { hands as en } from "../en/hands";

export const hands: Record<keyof typeof en, string> = {
  "hand.ten": "10",
  "hand.highCard": "高牌 {r}",
  "hand.pair": "一对 {r}",
  "hand.twoPair": "两对，{r} 和 {s}",
  "hand.trips": "三条 {r}",
  "hand.straight": "顺子，{r} 高",
  "hand.flush": "同花，{r} 高",
  "hand.fullHouse": "葫芦，三条 {r} 带一对 {s}",
  "hand.quads": "四条 {r}",
  "hand.straightFlush": "同花顺，{r} 高",
  "hand.uncontested": "无人争夺（其他人都弃牌）",
  "bots.reason.fold": "{hand} 弃牌：在 {pos}、ICM 压力{pressure}时，胜率 {eq} 低于所需的底池赔率 {odds}。",
  "bots.reason.call_profitable": "{hand} 跟注：在 {pos}，胜率 {eq} 对比底池赔率 {odds}；ICM 压力{pressure}（有利可图）。",
  "bots.reason.call_marginal": "{hand} 跟注：在 {pos}，胜率 {eq} 对比底池赔率 {odds}；ICM 压力{pressure}（勉强）。",
  "bots.reason.bet": "{hand} 在 {pos} 下注：胜率 {eq}，后手 {bb} BB，底池赔率 {odds}。",
  "bots.reason.check": "{hand} 在 {pos} 过牌：胜率 {eq}，后手 {bb} BB。",
  "bots.reason.all_in": "{hand} 以 {bb} BB 全下：胜率 {eq}，ICM 压力{pressure}。",
  "bots.faced.unopened": "无人开池",
  "bots.faced.no_bet": "没有下注",
  "bots.faced.raise_to": "加注到 {amount}",
  "bots.faced.big_blind": "大盲 {amount}",
  "bots.faced.bet": "下注 {amount}",
  "bots.pressure.LOW": "低",
  "bots.pressure.MEDIUM": "中等",
  "bots.pressure.HIGH": "高",
  "bots.pressure.VERY HIGH": "很高",
};
