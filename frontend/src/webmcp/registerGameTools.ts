import type { ActionKind, Card, HandReview, PlayerView, TableState } from "../models/game";

type JsonSchema = {
  type: "object";
  properties: Record<string, { type: string; description?: string }>;
  required?: string[];
  additionalProperties?: boolean;
};

type ToolContext = { signal: AbortSignal };

type WebMcpTool = {
  name: string;
  description: string;
  inputSchema: JsonSchema;
  annotations?: { readOnlyHint?: boolean; untrustedContentHint?: boolean };
  execute: (input: Record<string, unknown>, context?: ToolContext) => unknown | Promise<unknown>;
};

type ModelContext = {
  registerTool: (tool: WebMcpTool, options?: { signal?: AbortSignal }) => void | Promise<void>;
};

type WebMcpDocument = { modelContext?: ModelContext };

export interface GameToolRegistration {
  ready: Promise<void>;
  cleanup: () => void;
}

export interface HandHistoryEntry {
  handNumber: number;
  heroPosition: string;
  pot: number;
  winnerSeats: number[];
  stage: string;
  net: number;
  heroDecision: string | null;
  coachRecommendation: string | null;
  grade: string | null;
  level: number;
  blindLevel: string;
}

export interface GameToolActions {
  tableId: string;
  getState: () => TableState | null;
  isPaused: () => boolean;
  countdown: () => number | null;
  isReviewOpen: () => boolean;
  act: (kind: ActionKind, amount?: number) => Promise<TableState | undefined>;
  nextHand: () => Promise<TableState>;
  startNewHand: () => Promise<TableState>;
  getHandHistory: () => Promise<HandHistoryEntry[]>;
  pause: () => void;
  resume: () => void;
  showHandResult: () => void;
}

const noInput: JsonSchema = {
  type: "object",
  properties: {
    _: { type: "boolean", description: "Optional compatibility parameter; ignored by the tool." },
  },
  additionalProperties: false,
};

const betInput: JsonSchema = {
  type: "object",
  properties: {
    amount: { type: "number", description: "Bet amount in chips." },
  },
  required: ["amount"],
  additionalProperties: false,
};

const activeRegistrations = new WeakMap<ModelContext, Map<string, AbortController>>();

function publicPlayer(player: PlayerView) {
  const { holeCards, ...visible } = player;
  return player.isHero && holeCards ? { ...visible, holeCards } : visible;
}

function publicReview(review: HandReview | null | undefined) {
  if (!review) return null;
  return {
    handNumber: review.handNumber,
    pot: review.pot,
    board: review.board,
    heroSeat: review.heroSeat,
    heroCards: review.heroCards,
    heroStart: review.heroStart,
    heroEnd: review.heroEnd,
    heroNet: review.heroNet,
    heroWon: review.heroWon,
    chop: review.chop,
    heroPosition: review.heroPosition,
    winners: review.winners,
    foldedSeats: review.foldedSeats,
    allInSeats: review.allInSeats,
    showdown: review.showdown.map(({ seat, name, cards, handName, isHero, won }) => ({
      seat, name, cards, handName, isHero, won,
    })),
    actions: review.actions.map(({ seat, name, action, amount, street }) => ({
      seat, name, action, amount, street,
    })),
    winningHandName: review.winningHandName,
    heroHandName: review.heroHandName,
    pressure: review.pressure,
  };
}

function publicGameState(state: TableState, isPaused: boolean, countdown: number | null) {
  const currentPlayer = state.players.find((player) => player.seat === state.currentActor) ?? null;
  const status = (state as TableState & { status?: string }).status;
  return {
    table: { id: state.tableId, label: state.tableLabel ?? null },
    tournament: {
      status: status ?? null,
      handNumber: state.handNumber,
      playersRemaining: state.playersRemaining ?? null,
      playersInHand: state.inHand ?? null,
      totalChips: state.totalChips ?? null,
      averageStack: state.averageStack ?? null,
      blindLevel: state.level,
      timer: {
        secondsLeft: state.secondsLeft,
        inBreak: state.inBreak ?? false,
        autoNextPaused: isPaused,
        autoNextCountdown: countdown,
      },
    },
    phase: state.phase,
    street: state.street,
    currentPlayer: currentPlayer ? publicPlayer(currentPlayer) : null,
    players: state.players.map(publicPlayer),
    blinds: { small: state.smallBlind, big: state.bigBlind, ante: state.ante },
    pot: state.pot,
    board: state.communityCards as Card[],
    availableActions: state.legalActions,
    toCall: state.toCall,
    dealerSeat: state.dealerSeat,
    heroSeat: state.heroSeat,
    waitingForHero: state.waitingForHero,
    actionLog: state.actionLog ?? [],
    result: publicReview(state.review),
  };
}

function publicCurrentHand(state: TableState) {
  return {
    handNumber: state.handNumber,
    phase: state.phase,
    street: state.street,
    players: state.players.map(publicPlayer),
    currentActor: state.currentActor,
    waitingForHero: state.waitingForHero,
    blinds: { small: state.smallBlind, big: state.bigBlind, ante: state.ante },
    pot: state.pot,
    board: state.communityCards,
    toCall: state.toCall,
    availableActions: state.legalActions,
    actions: state.actionLog ?? [],
    result: publicReview(state.review),
  };
}

function publicHistoryEntry(entry: HandHistoryEntry) {
  return {
    handNumber: entry.handNumber,
    heroPosition: entry.heroPosition,
    pot: entry.pot,
    winnerSeats: entry.winnerSeats,
    stage: entry.stage,
    net: entry.net,
    heroDecision: entry.heroDecision,
    coachRecommendation: entry.coachRecommendation,
    grade: entry.grade,
    level: entry.level,
    blindLevel: entry.blindLevel,
  };
}

function actionFailure() {
  return { ok: false, error: "Action was not applied. Check the current game state and try again." };
}

async function runAction(actions: GameToolActions, kind: ActionKind, amount?: number) {
  if (!actions.getState()) return actionFailure();
  const state = await actions.act(kind, amount);
  return state
    ? { ok: true, gameState: publicGameState(state, actions.isPaused(), actions.countdown()) }
    : actionFailure();
}

function buildTools(actions: GameToolActions): WebMcpTool[] {
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

export function registerGameTools(
  actions: GameToolActions,
  target?: WebMcpDocument,
): GameToolRegistration | undefined {
  const page = target ?? (typeof document === "undefined" ? undefined : document as WebMcpDocument);
  const context = page?.modelContext;
  if (!context || typeof context.registerTool !== "function") return undefined;

  let scopes = activeRegistrations.get(context);
  if (!scopes) {
    scopes = new Map();
    activeRegistrations.set(context, scopes);
  }
  const existing = scopes.get(actions.tableId);
  if (existing && !existing.signal.aborted) {
    return { ready: Promise.resolve(), cleanup: () => undefined };
  }

  const controller = new AbortController();
  scopes.set(actions.tableId, controller);
  const registrations = buildTools(actions).map((tool) => {
    try {
      return Promise.resolve(context.registerTool(tool, { signal: controller.signal })).then(
        () => null,
        (error: unknown) => ({ toolName: tool.name, error }),
      );
    } catch (error) {
      return Promise.resolve({ toolName: tool.name, error });
    }
  });

  const ready = Promise.all(registrations).then((failures) => {
    if (controller.signal.aborted) return;
    for (const failure of failures) {
      if (failure) {
        console.error(`[ICM MASTER WebMCP] Failed to register tool "${failure.toolName}".`, failure.error);
      }
    }
  });

  const cleanup = () => {
    if (scopes?.get(actions.tableId) !== controller) return;
    scopes.delete(actions.tableId);
    controller.abort();
  };

  return { ready, cleanup };
}
