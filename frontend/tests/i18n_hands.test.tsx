/* Hand names and the bots' reasons in Spanish (plan 093 step 4b). English must
 * come out exactly as the server wrote it, and every server code needs Spanish. */
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "fs";
import { BotExplanations } from "../src/components/BotExplanations";
import { HandReview } from "../src/components/HandReview";
import { I18nProvider } from "../src/i18n/I18n";
import { setCurrentLang } from "../src/i18n/lang";
import { en } from "../src/i18n/messages/en";
import { es } from "../src/i18n/messages/es";
import { botFaced, botReason, handName } from "../src/i18n/review";
import { translate } from "../src/i18n/translate";
import type { MessageKey } from "../src/i18n/messages/en";
import type { BotExplanation } from "../src/models/game";
import type { Params } from "../src/i18n/translate";
import { sampleReview } from "../src/sampleState";

const tEs = (key: MessageKey, params?: Params) => translate("es", key, params);
const tEn = (key: MessageKey, params?: Params) => translate("en", key, params);

// backend/app/services/bot_texts.py: NAME: dict[...] = { "code": "part " "part", ... }
const TEXTS_PY = readFileSync("../backend/app/services/bot_texts.py", "utf8");
const table = (name: string) => {
  const start = TEXTS_PY.indexOf(`${name}: dict`);
  const body = TEXTS_PY.slice(start, TEXTS_PY.indexOf("\n}", start));
  return Object.fromEntries([...body.matchAll(/"(\w+)":\s*((?:"[^"]*"\s*)+),/g)]
    .map(([, code, parts]) => [code, [...parts.matchAll(/"([^"]*)"/g)].map((p) => p[1]).join("")]));
};

// the forms backend/tests/services/test_bot_texts.py pins for hand_description
const SERVER_HANDS: [string, string][] = [
  ["High Card A", "Carta alta A"], ["Pair of Js", "Pareja de J"], ["Two Pair, Ts & 9s", "Doble pareja, 10 y 9"],
  ["Three of a Kind, 7s", "Trío de 7"], ["Straight, J high", "Escalera al J"], ["Flush, A high", "Color al A"],
  ["Full House, Ks full of 2s", "Full de K con 2"], ["Four of a Kind, 5s", "Póquer de 5"],
  ["Straight Flush, A high", "Escalera de color al A"],
  ["Uncontested (all others folded)", "Sin disputa (los demás no fueron)"],
];

const call: BotExplanation = { seat: 1, name: "Emma 1", action: "call", amount: 45000, street: "flop", position: "BTN",
  hand: "Q♣ J♣", handCode: "QJs", stackBB: 12.5, potOdds: "25%", equity: "38%", icmPressure: "Very High",
  faced: "Bet 45000", facedCode: "bet", facedParams: { amount: "45000" },
  reason: "Calling with Q♣ J♣ - 38% equity vs 25% pot odds from BTN; ICM pressure Very High (profitable).",
  reasonCode: "call_profitable",
  reasonParams: { hand: "Q♣ J♣", eq: "38%", odds: "25%", pos: "BTN", pressure: "Very High" } };

afterEach(() => {
  cleanup();
  setCurrentLang("en");
});

describe("the bots' reasons", () => {
  it("has Spanish for every server code, and the server's English word for word", () => {
    for (const [prefix, name, size] of [["bots.reason", "DECISION", 5], ["bots.faced", "FACED", 5]] as const) {
      const server = table(name);
      expect(Object.keys(server)).toHaveLength(size);
      for (const [code, text] of Object.entries(server)) {
        const key = `${prefix}.${code}` as MessageKey;
        expect(en[key], code).toBe(text);
        expect(es[key], code).toBeTruthy();
      }
    }
  });

  it("writes the reason and the action faced from their codes", () => {
    expect(botReason(call, tEn)).toBe(call.reason);
    expect(botFaced(call, tEn)).toBe("Bet 45000");
    setCurrentLang("es");
    expect(botReason(call, tEs)).toBe(
      "Iguala con Q♣ J♣: equity del 38% frente a pot odds del 25% desde BTN; presión ICM muy alta (rentable).");
    expect(botFaced(call, tEs)).toBe("Apuesta de 45.000");
    const allIn = { ...call, reasonCode: "all_in", reasonParams: { hand: "A♠ A♦", bb: "12.5", eq: "85%", pressure: "Low" } };
    expect(botReason(allIn, tEs)).toBe("All-in con A♠ A♦ por 12,5 BB: equity del 85% con presión ICM baja.");
  });

  it("shows what an older server sent when there is no code", () => {
    const old = { ...call, reasonCode: undefined, facedCode: undefined };
    expect(botReason(old, tEs)).toBe(call.reason);
    expect(botFaced(old, tEs)).toBe("Bet 45000");
  });

  it("explains the bots in Spanish on the review", () => {
    render(<I18nProvider initial="es"><BotExplanations explanations={[call]} /></I18nProvider>);
    fireEvent.click(screen.getByRole("button", { name: /Emma 1/ }));
    expect(screen.getByText("Apuesta de 45.000")).toBeInTheDocument();
    expect(screen.getByText("12,5 BB")).toBeInTheDocument();
    expect(screen.getByText(/^Iguala con Q♣ J♣: equity del 38%/)).toBeInTheDocument();
  });
});

describe("hand names", () => {
  it("reads every server form back, English unchanged", () => {
    for (const [server, spanish] of SERVER_HANDS) {
      expect(handName(server, tEn), server).toBe(server);
      expect(handName(server, tEs), server).toBe(spanish);
    }
    expect(handName("Something new", tEs)).toBe("Something new");
  });

  it("names the winning hand in Spanish on the review", () => {
    render(<I18nProvider initial="es"><HandReview review={{ ...sampleReview(), winningHandName: "Pair of Ts" }}
      coach={null} comparison={null} totalPlayers={9} nameBySeat={new Map()} onBack={() => undefined} /></I18nProvider>);
    expect(screen.getByText("MANO GANADORA").nextSibling).toHaveTextContent("Pareja de 10");
  });
});
