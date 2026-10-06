/**
 * A47 — "TRY ONE SPOT": the one tournament spot the landing quiz reveals.
 *
 * The answer is NOT a guess. It is the output of the backend coach/ICM engine
 * for this exact CoachRequest, pinned by backend/tests/test_landing_spot.py
 * (A♥Q♠ in the big blind, 25 BB blinds, 18 BB left, 17 BB paid, the chip
 * leader shoved from the SB, two short stacks under 5 BB). Change the spot
 * here only together with that test.
 */

export interface LandingQuizFacts {
  recommendedAction: string;
  alternativeAction: string;
  confidence: number;
  reasoning: string;
  factRows: Array<{ label: string; value: string }>;
}

export const LANDING_SPOT =
  "A♥ Q♠ in the big blind \u00b7 25 BB blinds \u00b7 18 BB left in your stack " +
  "\u00b7 17 BB paid in the pot \u00b7 the chip leader shoved from the SB \u00b7 " +
  "two short stacks under 5 BB elsewhere";

export const LANDING_QUIZ_FACTS: LandingQuizFacts = {
  recommendedAction: "FOLD",
  alternativeAction: "CALL",
  confidence: 0.65,
  reasoning: "AQo equity ~33% below required 54%. ICM pressure MEDIUM.",
  factRows: [
    { label: "Est. equity", value: "33%" },
    { label: "Pot odds", value: "48%" },
    { label: "ICM pressure", value: "MEDIUM" },
    { label: "Risk premium", value: "MEDIUM" },
    { label: "Stack", value: "450 chips (18.0 BB)" },
    { label: "Effective stack", value: "425 chips (17.0 BB)" },
  ],
};
