import { afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { registerGameTools } from "../src/webmcp/registerGameTools";
import { useGameWebMcp } from "../src/webmcp/useGameWebMcp";
import { installModelContext, registerAndWait, restoreModelContext, setup } from "./webmcp_fixture";

afterEach(restoreModelContext);

describe("WebMCP game adapter: registration", () => {
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
});
