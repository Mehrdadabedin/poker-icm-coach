import { afterEach, describe, expect, it } from "vitest";
import { emptyReview, installModelContext, registerAndWait, restoreModelContext, setup } from "./webmcp_fixture";

afterEach(restoreModelContext);

describe("WebMCP game adapter: tool calls", () => {
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
