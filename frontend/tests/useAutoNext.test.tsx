/* Post-hand auto-next countdown (A10) — deterministic timing tests.
 * Verifies the hook starts at the configured seconds (10), decrements each
 * second, renders 0, and then triggers the next-hand callback after the "0"
 * frame. Uses fake timers for determinism. */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useAutoNext } from "../src/hooks/useAutoNext";

describe("useAutoNext post-hand countdown (10s)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  function setup() {
    const next = vi.fn();
    const { result } = renderHook(() => useAutoNext(next, 10));
    act(() => {
      result.current.start(10);
    });
    return { next, result };
  }

  it("starts at 10, reaches 0, holds 0 for a second, then triggers next-hand", () => {
    const { next, result } = setup();
    expect(result.current.countdown).toBe(10);
    expect(next).not.toHaveBeenCalled();

    // 9 seconds in -> countdown should read 1
    act(() => vi.advanceTimersByTime(9000));
    expect(result.current.countdown).toBe(1);
    expect(next).not.toHaveBeenCalled();

    // 10th second -> reaches 0, but does NOT fire yet (0 held for a beat)
    act(() => vi.advanceTimersByTime(1000));
    expect(result.current.countdown).toBe(0);
    expect(next).not.toHaveBeenCalled();

    // after the held "0" second -> next-hand callback fires
    act(() => vi.advanceTimersByTime(1000));
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("never fires early (before 0 is reached and held)", () => {
    const { next } = setup();
    act(() => vi.advanceTimersByTime(9999));
    expect(next).not.toHaveBeenCalled();
  });
});
