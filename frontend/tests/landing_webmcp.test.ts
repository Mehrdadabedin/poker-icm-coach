/* A47 — landing-page WebMCP tools: watch_demo, start_training, explain_icm.
 * Same registration mechanics as the game tools (src/webmcp), scoped to this
 * page only; the quiz answer they return mirrors the backend-pinned facts. */
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { registerLandingTools } from "../src/landing/registerLandingTools";
import { useLandingWebMcp } from "../src/landing/useLandingWebMcp";
import { LANDING_QUIZ_FACTS } from "../src/landing/landingQuizData";
import { installModelContext, restoreModelContext } from "./webmcp_fixture";

afterEach(restoreModelContext);

function landingActions() {
  const watchDemo = vi.fn();
  const startTraining = vi.fn();
  return { actions: { watchDemo, startTraining }, watchDemo, startTraining };
}

describe("landing WebMCP adapter", () => {
  it("does nothing when document.modelContext is unavailable", () => {
    Reflect.deleteProperty(document, "modelContext");
    expect(registerLandingTools(landingActions().actions)).toBeUndefined();
  });

  it("registers exactly watch_demo, start_training and explain_icm", async () => {
    const { tools } = installModelContext();
    const { actions } = landingActions();
    const registration = registerLandingTools(actions);
    await registration?.ready;

    expect(tools.map((tool) => tool.name)).toEqual([
      "watch_demo", "start_training", "explain_icm",
    ]);
    registration?.cleanup();
  });

  it("runs the page actions from the tools", async () => {
    const { tools } = installModelContext();
    const { actions, watchDemo, startTraining } = landingActions();
    const registration = registerLandingTools(actions);
    await registration?.ready;

    const byName = (name: string) => tools.find((tool) => tool.name === name)!;
    expect(await byName("watch_demo").execute({})).toMatchObject({ ok: true, target: "lp-demo" });
    expect(await byName("start_training").execute({})).toMatchObject({ ok: true, url: "#/login" });
    await byName("explain_icm").execute({});

    expect(watchDemo).toHaveBeenCalledOnce();
    expect(startTraining).toHaveBeenCalledOnce();
    registration?.cleanup();
  });

  it("explains the pinned quiz spot without exposing account data", async () => {
    const { tools } = installModelContext();
    const { actions } = landingActions();
    const registration = registerLandingTools(actions);
    await registration?.ready;

    const result = (await tools.find((tool) => tool.name === "explain_icm")!
      .execute({})) as { recommendedAction: string; reasoning: string; confidence: number };
    expect(result.recommendedAction).toBe("FOLD");
    expect(result.reasoning).toBe(LANDING_QUIZ_FACTS.reasoning);
    expect(result.confidence).toBe(0.65);
    expect(JSON.stringify(result)).not.toContain("token");
    expect(JSON.stringify(result)).not.toContain("username");
    registration?.cleanup();
  });

  it("deduplicates registrations for one context and aborts on cleanup", async () => {
    const { tools, signals } = installModelContext();
    const { actions } = landingActions();
    const first = registerLandingTools(actions);
    await first?.ready;
    const second = registerLandingTools(actions);
    await second?.ready;

    expect(tools).toHaveLength(3);
    second?.cleanup();
    expect(signals.every((signal) => signal.aborted)).toBe(false);
    first?.cleanup();
    expect(signals.every((signal) => signal.aborted)).toBe(true);
  });

  it("retries until modelContext appears, then cleans up on unmount", async () => {
    vi.useFakeTimers();
    Reflect.deleteProperty(document, "modelContext");
    const { actions } = landingActions();
    const hook = renderHook(() => useLandingWebMcp(actions));

    expect(document).not.toHaveProperty("modelContext");
    const { tools, signals } = installModelContext();
    await vi.advanceTimersByTimeAsync(250);
    expect(tools).toHaveLength(3);

    hook.unmount();
    expect(signals.every((signal) => signal.aborted)).toBe(true);
  });
});
