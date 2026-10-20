/* The ICM Coach tool's teaching note in Spanish (plan 093 step 5e). The server
 * sends the English note with a code and details; English must come out exactly
 * as the server wrote it, and every server code must have a Spanish sentence. */
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { readFileSync } from "fs";
import { CoachAdvicePanel, type Advice } from "../src/components/CoachAdvicePanel";
import { coachEducation } from "../src/i18n/coach";
import { I18nProvider } from "../src/i18n/I18n";
import { setCurrentLang } from "../src/i18n/lang";
import { en } from "../src/i18n/messages/en";
import { es } from "../src/i18n/messages/es";
import { translate } from "../src/i18n/translate";
import type { MessageKey } from "../src/i18n/messages/en";
import type { Params } from "../src/i18n/translate";

const tEs = (key: MessageKey, params?: Params) => translate("es", key, params);
const tEn = (key: MessageKey, params?: Params) => translate("en", key, params);

// backend/app/strategy/education.py: "code": "part " "part" ...,
const EDUCATION_PY = readFileSync("../backend/app/strategy/education.py", "utf8");
const TEXT_DICT = EDUCATION_PY.slice(EDUCATION_PY.indexOf("TEXT: dict"), EDUCATION_PY.indexOf("class Lesson"));
const SERVER = Object.fromEntries([...TEXT_DICT.matchAll(/"(\w+)":\s*((?:"[^"]*"\s*)+),/g)]
  .map(([, code, parts]) => [code, [...parts.matchAll(/"([^"]*)"/g)].map((p) => p[1]).join("")]));

const NEGATIVE = {
  education: "Although there are some outs / draws available, drawing probability alone is not enough: "
    + "the probability of actually winning and the 45,000 call determine that this spot is negative EV.",
  educationCode: "negative_some", educationParams: { call: "45,000" },
};

afterEach(() => {
  cleanup();
  setCurrentLang("en");
});

describe("the coach tool's teaching note", () => {
  it("has a Spanish sentence for every server code, and the server's English word for word", () => {
    expect(Object.keys(SERVER).length).toBe(8);
    for (const [code, text] of Object.entries(SERVER)) {
      const key = `coach.edu.${code}` as MessageKey;
      expect(en[key], code).toBe(text);
      expect(es[key], code).toBeTruthy();
    }
  });

  it("writes the note in Spanish with Spanish numbers", () => {
    setCurrentLang("es");
    expect(coachEducation(NEGATIVE, tEs)).toBe("Aunque hay algunos outs / proyectos disponibles, la probabilidad de "
      + "ligar no basta por sí sola: la probabilidad real de ganar y los 45.000 que cuesta igualar hacen que este spot tenga EV negativo.");
    expect(coachEducation({ education: "x", educationCode: "pot_odds_class",
      educationParams: { hand: "KJo", pos: "BB", opponents: "3", pot: "24,000", call: "12,000" } }, tEs))
      .toBe("KJo (clase de mano inicial) desde BB contra 3 rival(es): las pot odds (24.000 de bote, 12.000 para igualar) "
        + "y la textura de la mesa deciden si igualar o no ir conserva mejor tu equity en el torneo.");
  });

  it("leaves the English note exactly as the server wrote it", () => {
    expect(coachEducation(NEGATIVE, tEn)).toBe(NEGATIVE.education);
  });

  it("shows the server's note when the code is unknown or missing", () => {
    expect(coachEducation({ education: "Something new.", educationCode: "brand_new" }, tEs)).toBe("Something new.");
    expect(coachEducation({ education: "Old server." }, tEs)).toBe("Old server.");
  });

  it("shows the note in Spanish on the coach tool's panel", () => {
    const advice: Advice = { recommendedAction: "FOLD", confidence: 0.6, reasoning: "x", detail: {}, ev: null, outs: null, ...NEGATIVE };
    render(<I18nProvider initial="es"><CoachAdvicePanel advice={advice} /></I18nProvider>);
    expect(screen.getByTestId("coach-education")).toHaveTextContent("los 45.000 que cuesta igualar");
  });
});
