/* What the table announces to a screen reader (plan 111): one function of two snapshots. */
import { beforeEach, describe, expect, it } from "vitest";
import { setCurrentLang } from "../src/i18n/lang";
import { translate } from "../src/i18n/translate";
import type { CoachAdvice, TableAction, TableState } from "../src/models/game";
import { announcementsFor, type AnnounceOptions, type Announcements } from "../src/models/tableAnnouncements";
import { sampleReview, sampleTableState } from "../src/sampleState";

const en = (key: Parameters<typeof translate>[1], params?: Record<string, string | number>) => translate("en", key, params);
const es = (key: Parameters<typeof translate>[1], params?: Record<string, string | number>) => translate("es", key, params);
const RAISE: CoachAdvice = { recommendedAction: "RAISE", reasoning: "", detail: {} };
const NONE: AnnounceOptions = { coach: null, prevCoach: null };
const NOTHING: Announcements = { polite: null, assertive: null };

const act = (seat: number, action: string, amount: number | null): TableAction => ({ seat, action, amount, street: "flop" });
const withState = (patch: Partial<TableState>): TableState => ({ ...sampleTableState(), actionLog: [], ...patch });
const say = (prev: TableState | null, next: TableState, opts = NONE, t = en) => announcementsFor(prev, next, opts, t);

beforeEach(() => setCurrentLang("en"));

describe("bot actions", () => {
  it("says each new bot action, with the amount when there is one", () => {
    const prev = withState({});
    const next = withState({ actionLog: [act(2, "raise", 2400), act(3, "fold", null), act(4, "call", 2400)] });
    expect(say(prev, next).polite).toBe("Bot 2 raises to 2,400. Bot 3 folds. Bot 4 calls 2,400");
  });

  it("does not say the hero's own action, or an action it already said", () => {
    const prev = withState({ actionLog: [act(2, "bet", 300)] });
    const next = withState({ actionLog: [act(2, "bet", 300), act(0, "call", 300), act(3, "check", null)] });
    expect(say(prev, next).polite).toBe("Bot 3 checks");
  });

  it("starts again from the first action in a new hand", () => {
    const prev = withState({ handNumber: 7, actionLog: [act(2, "bet", 300), act(3, "fold", null)] });
    const next = withState({ handNumber: 8, actionLog: [act(4, "all_in", 5100)] });
    expect(say(prev, next).polite).toBe("Bot 4 goes all-in for 5,100");
  });

  it("counts a long run of actions and says only the last three", () => {
    const run = (n: number) => Array.from({ length: n }, (_, i) => act(2 + (i % 5), "call", 100 + i));
    const eight = say(withState({}), withState({ actionLog: run(8) })).polite ?? "";
    expect(eight.split(". ")).toHaveLength(8);
    expect(eight).not.toContain("actions");
    const nine = say(withState({}), withState({ actionLog: run(9) })).polite;
    expect(nine).toBe("9 actions. Bot 3 calls 106. Bot 4 calls 107. Bot 5 calls 108");
  });

  it("counts only the actions that are new, and not the hero's own", () => {
    const old = [act(2, "bet", 300)];
    const log = [...old, ...Array.from({ length: 13 }, (_, i) => act(i % 4 === 3 ? 0 : 3, "call", 300))];
    expect(say(withState({ actionLog: old }), withState({ actionLog: log })).polite).toMatch(/^10 actions\. /);
  });

  it("speaks Spanish when the page does", () => {
    const next = withState({ actionLog: [act(2, "raise", 2400)] });
    expect(say(withState({}), next, NONE, es).polite).toMatch(/^Bot 2 sube a 2[.,]400$/);
    const many = withState({ actionLog: Array.from({ length: 9 }, () => act(2, "check", null)) });
    expect(say(withState({}), many, NONE, es).polite).toMatch(/^9 acciones\. Bot 2 pasa/);
  });
});

describe("a new street", () => {
  it("names the flop, turn and river cards", () => {
    const none = withState({ communityCards: [] });
    const flop = withState({ communityCards: [{ rank: "A", suit: "s" }, { rank: "7", suit: "h" }, { rank: "2", suit: "c" }] });
    const turn = withState({ communityCards: [...flop.communityCards, { rank: "K", suit: "d" }] });
    const river = withState({ communityCards: [...turn.communityCards, { rank: "9", suit: "s" }] });
    expect(say(none, flop).polite).toBe("Flop: Ace of Spades, 7 of Hearts, 2 of Clubs");
    expect(say(flop, turn).polite).toBe("Turn: King of Diamonds");
    expect(say(turn, river).polite).toBe("River: 9 of Spades");
    expect(say(flop, flop).polite).toBeNull();
  });
});

describe("the hero's turn", () => {
  const waiting = (patch: Partial<TableState> = {}) => withState({ waitingForHero: true, toCall: 1200, pot: 3400, ...patch });

  it("is assertive, with the amount to call and the pot", () => {
    expect(say(withState({}), waiting())).toEqual({ polite: null, assertive: "Your turn. 1,200 to call. Pot 3,400." });
    expect(say(withState({}), waiting({ toCall: 0 })).assertive).toBe("Your turn. Nothing to call. Pot 3,400.");
  });

  it("adds the coach's advice for a Pro player, and nothing for a Free one", () => {
    expect(say(withState({}), waiting(), { coach: RAISE, prevCoach: null }).assertive).toBe("Your turn. 1,200 to call. Pot 3,400. Coach: RAISE");
    expect(say(withState({}), waiting(), NONE).assertive).not.toContain("Coach");
  });

  it("says only the advice when it arrives after the turn began", () => {
    const turn = waiting();
    expect(say(turn, turn, { coach: RAISE, prevCoach: null }).assertive).toBe("Coach: RAISE");
    expect(say(turn, turn, { coach: RAISE, prevCoach: RAISE }).assertive).toBeNull();
  });

  it("says the turn again after a bot acts and it comes back to the hero", () => {
    const first = waiting({ actionLog: [act(2, "bet", 300)] });
    const again = waiting({ actionLog: [act(2, "bet", 300), act(3, "raise", 900)] });
    expect(say(first, again).assertive).toContain("Your turn");
    expect(say(first, first).assertive).toBeNull();
  });
});

describe("the result and the level", () => {
  const over = (patch: Partial<TableState> = {}) => withState({ phase: "handOver", review: sampleReview(), ...patch });

  it("says the result once per hand", () => {
    const first = say(withState({}), over());
    expect(first.polite).toMatch(/^YOU (WON|LOST)|^CHOPPED|^NO CHANGE/);
    expect(say(over(), over()).polite).toBeNull();
    expect(say(over(), over({ handNumber: 8 })).polite).not.toBeNull();
  });

  it("says a new level, with the ante only when there is one", () => {
    expect(say(withState({ level: 1 }), withState({ level: 2, smallBlind: 100, bigBlind: 200 })).polite).toBe("Level 2, blinds 100/200");
    expect(say(withState({ level: 2 }), withState({ level: 3, smallBlind: 150, bigBlind: 300, ante: 25 })).polite).toBe("Level 3, blinds 150/300, ante 25");
  });

  it("says when a break starts and ends", () => {
    expect(say(withState({}), withState({ inBreak: true })).polite).toBe("Break");
    expect(say(withState({ inBreak: true }), withState({ inBreak: false })).polite).toBe("Break over");
  });
});

describe("a poll with nothing new", () => {
  it("says nothing for the same snapshot twice", () => {
    const state = withState({ actionLog: [act(2, "bet", 300)], waitingForHero: true, toCall: 300 });
    expect(say(state, { ...state })).toEqual(NOTHING);
  });

  it("says nothing when only the clock moved", () => {
    const state = withState({ actionLog: [act(2, "bet", 300)] });
    expect(say(state, { ...state, secondsLeft: state.secondsLeft - 1 })).toEqual(NOTHING);
  });
});
