import type { GameToolActions, WebMcpTool } from "./webmcpTypes";
import { betInput, noInput } from "./webmcpTypes";
import {
  actionFailure,
  publicCurrentHand,
  publicGameState,
  publicHistoryEntry,
  publicReview,
  runAction,
} from "./webmcpViews";

/** The full WebMCP tool list, bound to one table's actions (A46: no logging). */
export function buildTools(actions: GameToolActions): WebMcpTool[] {
  const readOnly = { readOnlyHint: true, untrustedContentHint: true };
  return [
    {
      name: "get_game_state",
      description: "Returns the current table, tournament, visible cards, stacks, pot, legal actions, and automatic next-hand timer state.",
      inputSchema: noInput,
      annotations: readOnly,
      execute: async () => {
        const state = actions.getState();
        return state
          ? publicGameState(state, actions.isPaused(), actions.countdown())
          : { available: false, message: "The table state is not loaded." };
      },
    },
    {
      name: "get_current_hand",
      description: "Returns the current hand state, visible cards, action log, and result when the hand is complete.",
      inputSchema: noInput,
      annotations: readOnly,
      execute: async () => {
        const state = actions.getState();
        return state
          ? publicCurrentHand(state)
          : { available: false, message: "The table state is not loaded." };
      },
    },
    {
      name: "get_hand_history",
      description: "Returns completed hand history for the current table, excluding account identity fields.",
      inputSchema: noInput,
      annotations: readOnly,
      execute: async () => ({
        tableId: actions.tableId,
        hands: (await actions.getHandHistory()).map(publicHistoryEntry),
      }),
    },
    {
      name: "start_new_hand",
      description: "Starts a fresh fast-mode practice tournament and opens its first dealt hand, replacing the current table view.",
      inputSchema: noInput,
      execute: async () => {
        const state = await actions.startNewHand();
        return { ok: true, gameState: publicGameState(state, false, null) };
      },
    },
    {
      name: "fold",
      description: "Folds the hero's current action using the existing game action and validation.",
      inputSchema: noInput,
      execute: async () => runAction(actions, "fold"),
    },
    {
      name: "check",
      description: "Checks using the existing game action and validation.",
      inputSchema: noInput,
      execute: async () => runAction(actions, "check"),
    },
    {
      name: "call",
      description: "Calls the current amount to call using the existing game action and validation.",
      inputSchema: noInput,
      execute: async () => {
        const state = actions.getState();
        return state ? runAction(actions, "call", state.toCall) : actionFailure();
      },
    },
    {
      name: "bet",
      description: "Submits a chip amount as a bet; existing game rules validate whether it is legal.",
      inputSchema: betInput,
      execute: async ({ amount }) => typeof amount === "number" && Number.isFinite(amount)
        ? runAction(actions, "bet", amount)
        : { ok: false, error: "amount must be a finite number." },
    },
    {
      name: "all_in",
      description: "Moves all-in using the amount currently advertised by the game, if available.",
      inputSchema: noInput,
      execute: async () => {
        const state = actions.getState();
        if (!state) return actionFailure();
        const amount = state.legalActions.find((action) => action.kind === "all_in")?.amount;
        return runAction(actions, "all_in", amount);
      },
    },
    {
      name: "next_hand",
      description: "Advances this table after the existing game flow permits the next hand.",
      inputSchema: noInput,
      execute: async () => {
        const state = await actions.nextHand();
        return { ok: true, gameState: publicGameState(state, actions.isPaused(), actions.countdown()) };
      },
    },
    {
      name: "pause_game",
      description: "Pauses the automatic next-hand countdown on the hand result screen.",
      inputSchema: noInput,
      execute: async () => {
        const state = actions.getState();
        if (!state || state.phase !== "handOver" || actions.isReviewOpen()) {
          return { ok: false, error: "Pause is available on the hand result screen." };
        }
        actions.pause();
        return { ok: true, autoNextPaused: true };
      },
    },
    {
      name: "resume_game",
      description: "Resumes the automatic next-hand countdown on the hand result screen.",
      inputSchema: noInput,
      execute: async () => {
        const state = actions.getState();
        if (!state || state.phase !== "handOver" || actions.isReviewOpen()) {
          return { ok: false, error: "Resume is available on the hand result screen." };
        }
        actions.resume();
        return { ok: true, autoNextPaused: false };
      },
    },
    {
      name: "show_hand_result",
      description: "Opens the existing detailed review for a completed hand.",
      inputSchema: noInput,
      execute: async () => {
        const state = actions.getState();
        if (!state || state.phase !== "handOver" || !state.review) {
          return { ok: false, error: "There is no completed hand result to review." };
        }
        actions.showHandResult();
        return { ok: true, result: publicReview(state.review) };
      },
    },
  ];
}
