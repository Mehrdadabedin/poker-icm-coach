import type { MessageKey } from "./messages/en";

/** Fixed poker word sets the server sends as English labels (plan 093). */
export const PRESSURE_KEY: Record<string, MessageKey> = {
  LOW: "pressure.low", MEDIUM: "pressure.medium", HIGH: "pressure.high", "VERY HIGH": "pressure.veryHigh",
};

/** An action as a sentence word ("Call 200"); the seat tags use tag.* (CALL). */
export const ACTION_KEY: Record<string, MessageKey> = {
  fold: "act.fold", check: "act.check", call: "act.call", bet: "act.bet", raise: "act.raise", all_in: "act.all_in",
};
