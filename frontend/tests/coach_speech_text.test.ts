/* What the coach says aloud (plan 112): the words, in both languages. */
import { describe, expect, it } from "vitest";
import { translate } from "../src/i18n/translate";
import type { CoachAdvice } from "../src/models/game";
import { decisionKey, spokenAdvice } from "../src/models/coachSpeech";
import { sampleTableState } from "../src/sampleState";
import { setCurrentLang } from "../src/i18n/lang";

const advice = (recommendedAction: string): CoachAdvice => ({ recommendedAction, reasoning: "", detail: {} });
const say = (action: string, lang: "en" | "es", patch = {}) => {
  setCurrentLang(lang);
  return spokenAdvice(advice(action), { ...sampleTableState(), toCall: 1200, ...patch }, (key, params) => translate(lang, key, params));
};

describe("the spoken action words", () => {
  it.each([
    ["FOLD", "Fold.", "No ir."], ["CHECK", "Check.", "Pasar."], ["BET", "Bet.", "Apostar."],
    ["RAISE", "Raise.", "Subir."], ["OPEN RAISE", "Raise.", "Subir."],
    ["3-BET", "Three-bet.", "Resubir."], ["4-BET", "Four-bet.", "Resubir."],
    ["OPEN JAM", "All-in.", "All-in."], ["RESHOVE", "All-in.", "All-in."], ["ALL-IN", "All-in.", "All-in."],
  ])("%s", (word, english, spanish) => {
    expect(say(word, "en")).toBe(english);
    expect(say(word, "es")).toBe(spanish);
  });

  it("says the amount to call, grouped in the page language", () => {
    expect(say("CALL", "en")).toBe("Call 1,200.");
    expect(say("CALL", "en", { toCall: 12000 })).toBe("Call 12,000.");
    expect(say("CALL", "es", { toCall: 12000 })).toBe("Igualar 12.000.");
    expect(say("CALL", "es")).toBe("Igualar 1200."); // es-ES does not group four digits, the panel does the same
  });

  it("says the stack when a call jam is bigger than it", () => {
    const players = sampleTableState().players.map((p) => (p.isHero ? { ...p, stack: 800 } : p));
    expect(say("CALL JAM", "en", { players })).toBe("Call 800.");
    expect(say("CALL JAM", "en")).toBe("Call 1,200.");
  });

  it("does not say an amount when there is nothing to call", () => {
    expect(say("CALL", "en", { toCall: 0 })).toBe("Call.");
  });

  it("says a word from a newer server as the panel words it, in lower case", () => {
    expect(say("SQUEEZE", "en")).toBe("squeeze.");
  });
});

describe("the decision key", () => {
  it("moves with the hand, the street and the action log, and not with the clock", () => {
    const base = sampleTableState();
    const key = decisionKey(base);
    expect(decisionKey({ ...base, secondsLeft: 5, pot: 1 })).toBe(key);
    expect(decisionKey({ ...base, handNumber: base.handNumber + 1 })).not.toBe(key);
    expect(decisionKey({ ...base, street: "turn" })).not.toBe(key);
    expect(decisionKey({ ...base, actionLog: [{ seat: 1, action: "bet", amount: 5, street: "flop" }] })).not.toBe(key);
  });
});
