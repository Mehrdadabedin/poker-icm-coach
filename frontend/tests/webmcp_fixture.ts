/* Shared WebMCP test fixture: a fake document.modelContext and a table. */
import { vi } from "vitest";
import { sampleTableState } from "../src/sampleState";
import type { ActionKind, HandReview, TableState } from "../src/models/game";
import type { HandHistoryEntry } from "../src/webmcp/registerGameTools";
import { registerGameTools } from "../src/webmcp/registerGameTools";

export type RegisteredTool = {
  name: string;
  inputSchema: {
    type: "object";
    properties: Record<string, { type: string; description?: string }>;
    required?: string[];
    additionalProperties?: boolean;
  };
  annotations?: { readOnlyHint?: boolean; untrustedContentHint?: boolean };
  execute: (input: Record<string, unknown>) => unknown | Promise<unknown>;
};

type RegistrationContext = {
  tools: RegisteredTool[];
  signals: AbortSignal[];
};

const originalContext = Object.getOwnPropertyDescriptor(document, "modelContext");

export function emptyReview(): HandReview {
  return {
    handNumber: 4,
    pot: 900,
    board: [],
    heroSeat: 0,
    heroCards: [],
    heroStart: 5000,
    heroEnd: 5900,
    heroNet: 900,
    heroWon: true,
    chop: false,
    heroPosition: "BTN",
    heroRankBefore: 2,
    heroRankAfter: 1,
    winners: [0],
    foldedSeats: [],
    allInSeats: [],
    showdown: [],
    actions: [],
    explanations: [],
    winningHandName: "Pair of Aces",
    heroHandName: "Pair of Aces",
    losingHandName: null,
    pressure: "LOW",
  };
}

export function installModelContext() {
  const tools: RegisteredTool[] = [];
  const signals: AbortSignal[] = [];
  const context = {
    registerTool: vi.fn((tool: RegisteredTool, options?: { signal?: AbortSignal }): void | Promise<void> => {
      tools.push(tool);
      if (options?.signal) signals.push(options.signal);
    }),
  };
  Object.defineProperty(document, "modelContext", {
    configurable: true,
    value: context,
  });
  return { context, tools, signals } satisfies RegistrationContext & { context: typeof context };
}

export async function registerAndWait(actions: Parameters<typeof registerGameTools>[0]) {
  const registration = registerGameTools(actions);
  await registration?.ready;
  return registration;
}

export function getTool(tools: RegisteredTool[], name: string) {
  const tool = tools.find((entry) => entry.name === name);
  if (!tool) throw new Error(`Missing WebMCP tool: ${name}`);
  return tool;
}

export function setup() {
  let state: TableState = {
    ...sampleTableState(),
    tableId: "table-123",
    tableLabel: "A",
    handNumber: 4,
    street: "preflop",
    username: "private-user",
    toCall: 275,
    status: "active",
    players: sampleTableState().players.map((player) => player.isHero
      ? player
      : { ...player, holeCards: [{ rank: "A", suit: "s" }] }),
    legalActions: [
      { kind: "fold" },
      { kind: "check" },
      { kind: "call", amount: 275 },
      { kind: "bet", minAmount: 100, maxAmount: 10000 },
      { kind: "all_in", amount: 4321 },
    ],
  } as TableState;
  let paused = false;
  let reviewOpen = false;
  const historyRow = {
    handNumber: 3,
    heroPosition: "BTN",
    pot: 1100,
    winnerSeats: [0],
    stage: "middle",
    net: 450,
    heroDecision: "CALL",
    coachRecommendation: "CALL",
    grade: "PREFERRED",
    level: 2,
    blindLevel: "100/200",
    username: "private-user",
    accessToken: "must-not-leak",
  } as unknown as HandHistoryEntry;
  const act = vi.fn(async (_kind: ActionKind, _amount?: number): Promise<TableState | undefined> => state);
  const nextHand = vi.fn(async () => state);
  const startNewHand = vi.fn(async () => ({ ...state, tableId: "table-456", tableLabel: "B" }));
  const getHandHistory = vi.fn(async () => [historyRow]);
  const pause = vi.fn(() => { paused = true; });
  const resume = vi.fn(() => { paused = false; });
  const showHandResult = vi.fn(() => { reviewOpen = true; });

  const actions = {
    tableId: "table-123",
    getState: () => state,
    isPaused: () => paused,
    countdown: () => 7,
    isReviewOpen: () => reviewOpen,
    act,
    nextHand,
    startNewHand,
    getHandHistory,
    pause,
    resume,
    showHandResult,
  };
  const setState = (next: TableState) => { state = next; };
  return { actions, act, nextHand, startNewHand, getHandHistory, pause, resume, showHandResult, setState, getTool };
}

export function restoreModelContext() {
  if (originalContext) Object.defineProperty(document, "modelContext", originalContext);
  else Reflect.deleteProperty(document, "modelContext");
  vi.useRealTimers();
  vi.restoreAllMocks();
}
