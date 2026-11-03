/* Plan 109: what a player sees when the backend answers 429. */
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { LoginForm } from "../src/components/LoginForm";
import { en } from "../src/i18n/messages/en";
import { es } from "../src/i18n/messages/es";
import { coachAdvice, login, register } from "../src/services/api";
import { limitedFetch, minutesToWait, RateLimitError } from "../src/services/rateLimit";

function answer(status: number, headers: Record<string, string> = {}, body: unknown = {}) {
  return vi.fn(async () => new Response(JSON.stringify(body), { status, headers }));
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
  vi.doUnmock("../src/services/api");
  localStorage.clear();
});

describe("limitedFetch", () => {
  it("throws the server's wait on 429", async () => {
    vi.stubGlobal("fetch", answer(429, { "Retry-After": "125" }));
    const error = await limitedFetch("/x").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(RateLimitError);
    expect((error as RateLimitError).retryAfterSeconds).toBe(125);
    expect(minutesToWait(error as RateLimitError)).toBe(3);
  });

  it("waits a minute when the header cannot be read", async () => {
    vi.stubGlobal("fetch", answer(429));
    const error = await limitedFetch("/x").catch((e: unknown) => e);
    expect((error as RateLimitError).retryAfterSeconds).toBe(60);
  });

  it("passes every other answer through", async () => {
    vi.stubGlobal("fetch", answer(401));
    expect((await limitedFetch("/x")).status).toBe(401);
  });
});

describe("api calls", () => {
  it("sign-in, sign-up and the coach all raise RateLimitError", async () => {
    vi.stubGlobal("fetch", answer(429, { "Retry-After": "60" }));
    await expect(login("a", "b")).rejects.toBeInstanceOf(RateLimitError);
    await expect(register("a", "password1")).rejects.toBeInstanceOf(RateLimitError);
    await expect(coachAdvice("t1")).rejects.toBeInstanceOf(RateLimitError);
  });

  it("a wrong password still shows the server's own message", async () => {
    vi.stubGlobal("fetch", answer(401, {}, { detail: "invalid username or password" }));
    await expect(login("a", "b")).rejects.toThrow("invalid username or password");
  });
});

describe("the sign-in screen", () => {
  it("says how long to wait instead of an error code", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) =>
      url.includes("/providers")
        ? new Response(JSON.stringify({ google: false }), { status: 200 })
        : new Response("{}", { status: 429, headers: { "Retry-After": "300" } })));
    render(<MemoryRouter><LoginForm onLogin={() => undefined} /></MemoryRouter>);
    await act(async () => undefined);
    fireEvent.change(screen.getByLabelText(/email or username/i), { target: { value: "player" } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: "password1" } });
    const form = screen.getByLabelText(/^password$/i).closest("form");
    fireEvent.submit(form as HTMLFormElement);
    expect(await screen.findByText(/too many attempts.*5 min/i)).toBeTruthy();
    expect(screen.queryByText(/429/)).toBeNull();
  });
});

describe("the table coach", () => {
  it("clears old advice on 429, so the player never sees a past decision's numbers", async () => {
    const coach = vi.fn();
    vi.doMock("../src/services/api", async (importOriginal) => ({
      ...(await importOriginal<Record<string, unknown>>()),
      coachAdvice: coach,
    }));
    const { useTableCoach } = await import("../src/hooks/useTableCoach");
    // Same class as the hook's: the mock above reloads the modules.
    const { RateLimitError: LoadedError } = await import("../src/services/rateLimit");
    const plan = { known: true, pro: true, loading: false };
    coach.mockResolvedValueOnce({ recommendedAction: "fold" });
    const { result, rerender } = renderHook(
      ({ n }) => useTableCoach("t1", { waitingForHero: true, actionLog: Array(n), phase: "play" } as never,
        vi.fn(async () => undefined), plan as never),
      { initialProps: { n: 1 } },
    );
    await waitFor(() => expect(result.current.coach).not.toBeNull());
    coach.mockRejectedValueOnce(new LoadedError(60));
    rerender({ n: 2 });
    await waitFor(() => expect(result.current.coach).toBeNull());
  });
});

describe("the messages", () => {
  it("exist in English and Spanish and name the wait", () => {
    for (const messages of [en, es]) {
      expect(messages["auth.tooManyAttempts"]).toContain("{minutes}");
      expect(messages["coachPage.tooMany"]).toContain("{minutes}");
    }
  });
});
