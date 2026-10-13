/* A table the server no longer has stays gone (plan 077): the table page used
 * to keep asking for its state every 350 ms, so a tab left open on an ended
 * table sent a 404 to the server about three times a second. */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";

const { getState } = vi.hoisted(() => ({ getState: vi.fn() }));
vi.mock("../src/services/api", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getState,
}));

import { useGame } from "../src/hooks/useGame";

beforeEach(() => {
  vi.useFakeTimers();
  getState.mockReset();
});
afterEach(() => vi.useRealTimers());

describe("useGame on a table the server no longer has", () => {
  it("stops asking after the first 404", async () => {
    getState.mockRejectedValue(new Error('API 404: {"detail":"table not found"}'));
    const { result } = renderHook(() => useGame("gone-table"));
    await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
    expect(getState).toHaveBeenCalledTimes(1);
    expect(result.current.error).toMatch(/^API 404/);
  });

  it("keeps asking through other errors, so a short outage recovers", async () => {
    getState.mockRejectedValue(new Error("Failed to fetch"));
    renderHook(() => useGame("live-table"));
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    expect(getState.mock.calls.length).toBeGreaterThan(1);
  });
});
