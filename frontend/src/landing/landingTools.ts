/**
 * A47 — WebMCP tools for the public landing page only: watch_demo,
 * start_training and explain_icm. They are bound to simple page actions in
 * useLandingWebMcp and are registered with the same pattern as the game
 * tools (src/webmcp), but never expose table, account or history data.
 */
import type { WebMcpTool } from "../webmcp/webmcpTypes";
import { noInput } from "../webmcp/webmcpTypes";
import { LANDING_QUIZ_FACTS, LANDING_SPOT } from "./landingQuizData";

export interface LandingToolActions {
  watchDemo: () => void;
  startTraining: () => void;
}

export function buildLandingTools(actions: LandingToolActions): WebMcpTool[] {
  const readOnly = { readOnlyHint: true, untrustedContentHint: true };
  return [
    {
      name: "watch_demo",
      description: "Scrolls the ICMBOT landing page to the demo video section and confirms the target.",
      inputSchema: noInput,
      annotations: readOnly,
      execute: () => {
        actions.watchDemo();
        return { ok: true, target: "lp-demo" };
      },
    },
    {
      name: "start_training",
      description: "Opens the existing sign-in screen so the visitor can start training.",
      inputSchema: noInput,
      execute: () => {
        actions.startTraining();
        return { ok: true, url: "#/login" };
      },
    },
    {
      name: "explain_icm",
      description:
        "Explains what the ICM coach recommends for the landing-page bubble spot, " +
        "with the same answer the backend engine test pins.",
      inputSchema: noInput,
      annotations: readOnly,
      execute: () => ({
        spot: LANDING_SPOT,
        recommendedAction: LANDING_QUIZ_FACTS.recommendedAction,
        alternativeAction: LANDING_QUIZ_FACTS.alternativeAction,
        icmPressure: LANDING_QUIZ_FACTS.icmPressure,
        explanation: LANDING_QUIZ_FACTS.explanation,
      }),
    },
  ];
}
