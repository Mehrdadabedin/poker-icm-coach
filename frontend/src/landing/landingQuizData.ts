/**
 * A47 — "TRY ONE SPOT": the one tournament spot the landing quiz reveals (v2,
 * a real bubble spot). The answer is NOT a guess: it is the output of the
 * backend coach/ICM engine for this exact CoachRequest, pinned by
 * backend/tests/test_landing_spot.py (4 left / 3 paid = BUBBLE stage, payouts
 * 50/30/20, hero KJo 14 BB in the big blind, chip leader (40 BB) shoved from
 * the SB, short stack at 3 BB). Change the spot here only with that test.
 */

export interface LandingQuizFacts {
  recommendedAction: string;
  alternativeAction: string;
  icmPressure: string;
  explanation: string;
}

export const LANDING_SPOT: string[] = [
  "4 left, 3 paid.",
  "You: K♠ J♥ — 14 BB in the big blind.",
  "Chip leader (40 BB) shoves from the small blind.",
  "Short stack has 3 BB.",
];

export const LANDING_QUIZ_FACTS: LandingQuizFacts = {
  recommendedAction: "FOLD",
  alternativeAction: "CALL",
  icmPressure: "VERY HIGH",
  explanation:
    "You are on the bubble: 4 players left and only 3 paid. Calling the shove " +
    "is roughly break-even in chips but loses tournament equity (ICM EV is " +
    "negative), so the coach folds and keeps your 14 BB for the next spot.",
};
