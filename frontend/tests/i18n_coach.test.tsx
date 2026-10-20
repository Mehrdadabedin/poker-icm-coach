/* What the coach writes on the server, in Spanish (plan 093 step 4a). The
 * server sends English plus codes; English must come out exactly as the server
 * wrote it, and every server code must have a Spanish sentence. */
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { readFileSync } from "fs";
import { CoachPanelView } from "../src/components/CoachPanelView";
import { actionWord, coachReason, factorRow, gradeLine } from "../src/i18n/coach";
import { I18nProvider } from "../src/i18n/I18n";
import { setCurrentLang } from "../src/i18n/lang";
import { en } from "../src/i18n/messages/en";
import { es } from "../src/i18n/messages/es";
import { translate } from "../src/i18n/translate";
import type { MessageKey } from "../src/i18n/messages/en";
import type { Params } from "../src/i18n/translate";

const tEs = (key: MessageKey, params?: Params) => translate("es", key, params);
const tEn = (key: MessageKey, params?: Params) => translate("en", key, params);

// backend/app/strategy/reasons.py: "code": "text" or "code": "part " "part",
const REASONS_PY = readFileSync("../backend/app/strategy/reasons.py", "utf8");
const TEXT_DICT = REASONS_PY.slice(REASONS_PY.indexOf("TEXT: dict"), REASONS_PY.indexOf("FIRST_SENTENCE ="));
const SERVER = Object.fromEntries([...TEXT_DICT.matchAll(/"(\w+)":\s*((?:"[^"]*"\s*)+),/g)]
  .map(([, code, parts]) => [code, [...parts.matchAll(/"([^"]*)"/g)].map((p) => p[1]).join("")]));

afterEach(() => {
  cleanup();
  setCurrentLang("en");
});

describe("the coach's sentences", () => {
  it("has a Spanish sentence for every server code, and the server's English word for word", () => {
    expect(Object.keys(SERVER).length).toBeGreaterThanOrEqual(26);
    for (const [code, text] of Object.entries(SERVER)) {
      const key = `coach.reason.${code}` as MessageKey;
      expect(en[key], code).toBe(text);
      expect(es[key], code).toBeTruthy();
    }
  });

  it("writes the reason in Spanish, the ICM pressure too", () => {
    expect(coachReason({ reasoning: "x", reasonCode: "open_out", reasonParams: { hand: "J7o", pos: "CO" } }, tEs))
      .toBe("J7o no está en el rango de apertura de CO.");
    expect(coachReason({ reasoning: "x", reasonCode: "call_below_icm",
      reasonParams: { hand: "Q9o", eq: "31%", req: "38%", pressure: "HIGH" } }, tEs))
      .toBe("La equity de Q9o (~31%) no llega a lo necesario (38%). Presión ICM ALTA.");
  });

  it("shows the server's sentence when the code is unknown or missing", () => {
    expect(coachReason({ reasoning: "Something new.", reasonCode: "brand_new" }, tEs)).toBe("Something new.");
    expect(coachReason({ reasoning: "Old server." }, tEs)).toBe("Old server.");
  });

  it("names the actions as Spanish players do", () => {
    expect(["FOLD", "CHECK", "CALL", "RAISE", "OPEN JAM", "3-BET", "ALL_IN"].map((w) => actionWord(w, tEs)))
      .toEqual(["NO IR", "PASAR", "IGUALAR", "SUBIR", "ALL-IN", "3-BET", "ALL-IN"]);
    expect(actionWord("SOMETHING", tEs)).toBe("SOMETHING");
  });
});

describe("the factor rows and the grade", () => {
  const rows: [string, string, string][] = [
    ["STACK", "44,900 chips (449.0 BB)", "44.900 fichas (449,0 BB)"],
    ["EFFECTIVE STACK", "4490 chips (44.9 BB)", "4490 fichas (44,9 BB)"],
    ["COVERAGE", "YOU COVER VILLAIN", "CUBRES AL RIVAL"],
    ["BUBBLE", "MIDDLE", "INTERMEDIA"],
    ["STACK BAND", "BIG STACK", "STACK GRANDE"],
    ["RISK PREMIUM", "MEDIUM", "MEDIA"],
    ["BOARD TEXTURE", "WET", "HÚMEDA"],
    ["CHIP EV", "POSITIVE EV (+12,000)", "EV POSITIVO (+12.000)"],
    ["ICM EV", "CALL vs FOLD: POSITIVE (fold 0.250 vs call 0.260)", "IGUALAR vs NO IR: POSITIVO (no ir 0,250 vs igualar 0,260)"],
    ["ICM EV", "FOLD (fold equity 0.250)", "NO IR (equity si no vas 0,250)"],
    ["SPR", "4.2", "4,2"],
  ];

  it("reads every row in Spanish", () => {
    setCurrentLang("es");
    for (const [label, value, spanish] of rows) expect(factorRow(label, value, { reasoning: "" }, tEs)[1], label).toBe(spanish);
    expect(factorRow("EFFECTIVE STACK", "1 chips (1.0 BB)", { reasoning: "" }, tEs)[0]).toBe("STACK EFECTIVO");
  });

  it("leaves every English row exactly as the server wrote it", () => {
    for (const [label, value] of rows) expect(factorRow(label, value, { reasoning: "" }, tEn), label).toEqual([label, value]);
  });

  it("grades in Spanish, and in English as the server did", () => {
    const c = { grade: "SUBOPTIMAL", heroAction: "CALL", coachAction: "FOLD", explanation: "CALL diverges from the recommended FOLD." };
    expect(gradeLine(c, tEs)).toEqual({ grade: "SUBÓPTIMA", text: "IGUALAR se aparta de la jugada recomendada: NO IR." });
    expect(gradeLine(c, tEn)).toEqual({ grade: "SUBOPTIMAL", text: c.explanation });
    expect(gradeLine({ ...c, grade: "PREFERRED", heroAction: "ALL_IN", coachAction: "OPEN JAM",
      explanation: "ALL-IN matches the recommended line." }, tEn).text).toBe("ALL-IN matches the recommended line.");
  });

  it("shows the whole coach panel in Spanish", () => {
    render(<I18nProvider initial="es"><CoachPanelView testId="coach-panel" coach={{
      recommendedAction: "FOLD", street: "preflop", reasoning: "J7o is not in the CO open range.",
      reasonCode: "open_out", reasonParams: { hand: "J7o", pos: "CO" },
      detail: { ACTION: "FOLD", WHY: "J7o is not in the CO open range.", COVERAGE: "VILLAIN COVERS YOU" } }} /></I18nProvider>);
    const panel = screen.getByTestId("coach-panel");
    expect(panel.querySelector(".coach-recommendation")).toHaveTextContent("NO IR");
    expect(panel).toHaveTextContent("J7o no está en el rango de apertura de CO.");
    expect(panel).toHaveTextContent("ACCIÓNNO IR");
    expect(panel).toHaveTextContent("POR QUÉJ7o no está en el rango de apertura de CO.");
    expect(panel).toHaveTextContent("COBERTURAEL RIVAL TE CUBRE");
  });
});
