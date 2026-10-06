import { afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { sampleTableState } from "../src/sampleState";
import type { ActionKind, HandReview, TableState } from "../src/models/game";
import type { HandHistoryEntry } from "../src/webmcp/registerGameTools";
import { registerGameTools } from "../src/webmcp/registerGameTools";
import { useGameWebMcp } from "../src/webmcp/useGameWebMcp";

type RegisteredTool = {
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

function emptyReview(): HandReview {
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

function installModelContext() {
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

async function registerAndWait(actions: Parameters<typeof registerGameTools>[0]) {
  const registration = registerGameTools(actions);
  await registration?.ready;
  return registration;
}

function setup() {
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
  const getTool = (tools: RegisteredTool[], name: string) => {
    const tool = tools.find((entry) => entry.name === name);
    if (!tool) throw new Error(`Missing WebMCP tool: ${name}`);
    return tool;
  };
  return { actions, act, nextHand, startNewHand, getHandHistory, pause, resume, showHandResult, setState, getTool };
}

afterEach(() => {
  if (originalContext) Object.defineProperty(document, "modelContext", originalContext);
  else Reflect.deleteProperty(document, "modelContext");
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("WebMCP game adapter", () => {
  it("does nothing when document.modelContext is unavailable", () => {
    Reflect.deleteProperty(document, "modelContext");
    const fixture = setup();

    expect(registerGameTools(fixture.actions)).toBeUndefined();
    expect(document).not.toHaveProperty("modelContext");
  });

  it("registers the expected tools with read-only annotations", async () => {
    const { tools } = installModelContext();
    const fixture = setup();
    const registration = await registerAndWait(fixture.actions);

    expect(tools.map((tool) => tool.name).sort()).toEqual([
      "all_in", "bet", "call", "check", "fold", "get_current_hand", "get_game_state",
      "get_hand_history", "next_hand", "pause_game", "resume_game", "show_hand_result",
      "start_new_hand",
    ].sort());
    for (const name of ["get_game_state", "get_current_hand", "get_hand_history"]) {
      expect(tools.find((tool) => tool.name === name)?.annotations?.readOnlyHint).toBe(true);
    }
    const noArgumentNames = [
      "get_game_state", "get_current_hand", "get_hand_history", "start_new_hand", "fold", "check",
      "call", "all_in", "next_hand", "pause_game", "resume_game", "show_hand_result",
    ];
    for (const name of noArgumentNames) {
      const schema = tools.find((tool) => tool.name === name)?.inputSchema;
      expect(schema?.properties._).toMatchObject({ type: "boolean" });
      expect(schema?.required ?? []).not.toContain("_");
      expect(schema?.additionalProperties).toBe(false);
    }
    expect(tools.find((tool) => tool.name === "bet")?.inputSchema).toMatchObject({
      properties: { amount: { type: "number" } },
      required: ["amount"],
      additionalProperties: false,
    });
    registration?.cleanup();
  });

  it("executes every no-argument tool with an empty object and ignores the compatibility property", async () => {
    const { tools } = installModelContext();
    const fixture = setup();
    const registration = await registerAndWait(fixture.actions);
    const noArgumentNames = [
      "get_game_state", "get_current_hand", "get_hand_history", "start_new_hand", "fold", "check",
      "call", "all_in", "next_hand", "pause_game", "resume_game", "show_hand_result",
    ];

    for (const name of noArgumentNames) {
      await fixture.getTool(tools, name).execute({});
    }
    await fixture.getTool(tools, "fold").execute({ _: true });

    expect(fixture.act).toHaveBeenCalledWith("fold", undefined);
    expect(fixture.act).toHaveBeenCalledWith("check", undefined);
    expect(fixture.act).toHaveBeenCalledWith("call", 275);
    expect(fixture.act).toHaveBeenCalledWith("all_in", 4321);
    expect(fixture.nextHand).toHaveBeenCalledOnce();
    expect(fixture.startNewHand).toHaveBeenCalledOnce();
    expect(fixture.getHandHistory).toHaveBeenCalledOnce();
    registration?.cleanup();
  });

  it("waits for every successful tool registration", async () => {
    const { context } = installModelContext();
    const pending: Array<() => void> = [];
    context.registerTool.mockImplementation((_tool, options) => new Promise<void>((resolve) => {
      pending.push(resolve);
      if (options?.signal) expect(options.signal.aborted).toBe(false);
    }));
    const fixture = setup();
    const registration = registerGameTools(fixture.actions);
    let completed = false;
    void registration?.ready.then(() => { completed = true; });

    expect(pending).toHaveLength(13);
    await Promise.resolve();
    expect(completed).toBe(false);
    for (const resolve of pending) resolve();
    await registration?.ready;

    expect(completed).toBe(true);
    registration?.cleanup();
  });

  it("silently drops rejected tool registrations without exposing private table data (A46)", async () => {
    const { context } = installModelContext();
    const failure = new Error("Unsupported tool schema");
    context.registerTool.mockImplementation((tool) => (
      tool.name === "fold" ? Promise.reject(failure) : undefined
    ));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const fixture = setup();
    const registration = await registerAndWait(fixture.actions);

    expect(consoleError).not.toHaveBeenCalledWith(
      '[ICM MASTER WebMCP] Failed to register tool "fold".',
      failure,
    );
    expect(consoleError).not.toHaveBeenCalledWith(expect.anything(), expect.stringContaining("private-user"));
    expect(failure).toBeInstanceOf(Error);
    registration?.cleanup();
  });

  it("returns safe structured game state and current hand data", async () => {
    const { tools } = installModelContext();
    const fixture = setup();
    const registration = await registerAndWait(fixture.actions);

    const gameState = await fixture.getTool(tools, "get_game_state").execute({}) as {
      table: { id: string };
      tournament: { handNumber: number; timer: { autoNextCountdown: number } };
      currentPlayer: unknown;
      players: Array<{ isHero: boolean; holeCards?: unknown }>;
      availableActions: unknown[];
    };
    expect(gameState.table.id).toBe("table-123");
    expect(gameState.tournament.handNumber).toBe(4);
    expect(gameState.tournament.timer.autoNextCountdown).toBe(7);
    expect(gameState.availableActions).toHaveLength(5);
    expect(gameState.players.find((player) => player.isHero)?.holeCards).toBeDefined();
    expect(gameState.players.find((player) => !player.isHero)).not.toHaveProperty("holeCards");
    expect(JSON.stringify(gameState)).not.toContain("private-user");

    const hand = await fixture.getTool(tools, "get_current_hand").execute({}) as {
      handNumber: number;
      street: string;
      actions: unknown[];
    };
    expect(hand.handNumber).toBe(4);
    expect(hand.street).toBe("preflop");
    expect(hand.actions).toEqual(fixture.actions.getState()?.actionLog ?? []);
    registration?.cleanup();
  });

  it("returns completed hand history without account identity fields", async () => {
    const { tools } = installModelContext();
    const fixture = setup();
    const registration = await registerAndWait(fixture.actions);

    const result = await fixture.getTool(tools, "get_hand_history").execute({}) as {
      tableId: string;
      hands: Array<Record<string, unknown>>;
    };
    expect(fixture.getHandHistory).toHaveBeenCalledOnce();
    expect(result.tableId).toBe("table-123");
    expect(result.hands[0]).toMatchObject({ handNumber: 3, heroPosition: "BTN", pot: 1100 });
    expect(result.hands[0]).not.toHaveProperty("username");
    expect(result.hands[0]).not.toHaveProperty("accessToken");
    registration?.cleanup();
  });

  it("routes fold, check, call, and bet through the existing action callback", async () => {
    const { tools } = installModelContext();
    const fixture = setup();
    const registration = await registerAndWait(fixture.actions);

    await fixture.getTool(tools, "fold").execute({});
    await fixture.getTool(tools, "check").execute({});
    await fixture.getTool(tools, "call").execute({});
    await fixture.getTool(tools, "bet").execute({ amount: 850 });

    expect(fixture.act).toHaveBeenNthCalledWith(1, "fold", undefined);
    expect(fixture.act).toHaveBeenNthCalledWith(2, "check", undefined);
    expect(fixture.act).toHaveBeenNthCalledWith(3, "call", 275);
    expect(fixture.act).toHaveBeenNthCalledWith(4, "bet", 850);
    registration?.cleanup();
  });

  it("reports a rejected bet when the existing action callback rejects it", async () => {
    const { tools } = installModelContext();
    const fixture = setup();
    fixture.act.mockResolvedValueOnce(undefined);
    const registration = await registerAndWait(fixture.actions);

    const result = await fixture.getTool(tools, "bet").execute({ amount: 50 }) as { ok: boolean };
    expect(fixture.act).toHaveBeenCalledWith("bet", 50);
    expect(result.ok).toBe(false);
    registration?.cleanup();
  });

  it("uses the existing advertised all-in amount", async () => {
    const { tools } = installModelContext();
    const fixture = setup();
    const registration = await registerAndWait(fixture.actions);

    await fixture.getTool(tools, "all_in").execute({});

    expect(fixture.act).toHaveBeenCalledWith("all_in", 4321);
    registration?.cleanup();
  });

  it("reuses next-hand and new-tournament functions", async () => {
    const { tools } = installModelContext();
    const fixture = setup();
    const registration = await registerAndWait(fixture.actions);

    const next = await fixture.getTool(tools, "next_hand").execute({}) as { ok: boolean };
    const fresh = await fixture.getTool(tools, "start_new_hand").execute({}) as {
      ok: boolean;
      gameState: { table: { id: string } };
    };

    expect(fixture.nextHand).toHaveBeenCalledOnce();
    expect(fixture.startNewHand).toHaveBeenCalledOnce();
    expect(next.ok).toBe(true);
    expect(fresh.gameState.table.id).toBe("table-456");
    registration?.cleanup();
  });

  it("reuses pause, resume, and hand-review controls", async () => {
    const { tools } = installModelContext();
    const fixture = setup();
    fixture.setState({ ...fixture.actions.getState()!, phase: "handOver", review: emptyReview() });
    const registration = await registerAndWait(fixture.actions);

    expect((await fixture.getTool(tools, "pause_game").execute({}) as { ok: boolean }).ok).toBe(true);
    expect(fixture.pause).toHaveBeenCalledOnce();
    expect((await fixture.getTool(tools, "resume_game").execute({}) as { ok: boolean }).ok).toBe(true);
    expect(fixture.resume).toHaveBeenCalledOnce();
    expect((await fixture.getTool(tools, "show_hand_result").execute({}) as { ok: boolean }).ok).toBe(true);
    expect(fixture.showHandResult).toHaveBeenCalledOnce();
    registration?.cleanup();
  });

  it("does not register duplicate tools for the same table and aborts on cleanup", async () => {
    const { tools, signals } = installModelContext();
    const fixture = setup();
    const registration = await registerAndWait(fixture.actions);
    const duplicateRegistration = await registerAndWait(fixture.actions);

    expect(tools).toHaveLength(13);
    duplicateRegistration?.cleanup();
    expect(signals[0].aborted).toBe(false);
    registration?.cleanup();
    expect(signals.every((signal) => signal.aborted)).toBe(true);
  });

  it("waits for the loaded table, avoids rerender duplicates, and cleans up on unmount", () => {
    const { tools, signals } = installModelContext();
    const fixture = setup();
    let bindings = { ...fixture.actions, enabled: true, stateAvailable: false };
    const hook = renderHook((current) => useGameWebMcp(current), { initialProps: bindings });

    expect(tools).toHaveLength(0);
    bindings = { ...bindings, stateAvailable: true };
    hook.rerender(bindings);
    hook.rerender({ ...bindings });
    expect(tools).toHaveLength(13);

    hook.unmount();
    expect(signals.every((signal) => signal.aborted)).toBe(true);
  });

  it("retries registration when modelContext becomes available later", async () => {
    vi.useFakeTimers();
    Reflect.deleteProperty(document, "modelContext");
    const fixture = setup();
    const bindings = { ...fixture.actions, enabled: true, stateAvailable: true };
    const hook = renderHook(() => useGameWebMcp(bindings));

    expect(document).not.toHaveProperty("modelContext");
    const { tools, signals } = installModelContext();
    await act(async () => { await vi.advanceTimersByTimeAsync(250); });
    expect(tools).toHaveLength(13);

    hook.unmount();
    expect(signals.every((signal) => signal.aborted)).toBe(true);
  });

  it("does not expose result data before a hand is complete", async () => {
    const { tools } = installModelContext();
    const fixture = setup();
    const registration = await registerAndWait(fixture.actions);

    const result = await fixture.getTool(tools, "show_hand_result").execute({}) as { ok: boolean };
    expect(result.ok).toBe(false);
    expect(fixture.showHandResult).not.toHaveBeenCalled();
    registration?.cleanup();
  });
});
