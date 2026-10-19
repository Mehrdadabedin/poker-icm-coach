/* A39 tests: re-entry modal (L1-L5) and BOT auto-finish condition. */
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ReentryModal } from "../src/components/ReentryModal";
import { autoFinishActive } from "../src/pages/TablePage";

describe("ReentryModal (A39)", () => {
  it("shows the Level 1-5 re-entry state: continue, watch or end (plan 092)", () => {
    render(<ReentryModal available onContinue={() => undefined} />);
    expect(screen.getByText("YOU LOST THE ALL-IN")).toBeInTheDocument();
    expect(screen.getByText("Re-entry is still available.")).toBeInTheDocument();
    // START NEW GAME is on the standings list END GAME opens (the owner: one of the two)
    expect(screen.getAllByRole("button").map((b) => b.textContent))
      .toEqual(["CONTINUE TOURNAMENT", "WATCH TO THE END", "END GAME"]);
  });

  it("fires CONTINUE TOURNAMENT and END GAME", () => {
    const onContinue = vi.fn();
    const onEnd = vi.fn();
    render(<ReentryModal available onContinue={onContinue} onEnd={onEnd} />);
    fireEvent.click(screen.getByTestId("reentry-continue"));
    expect(onContinue).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByTestId("reentry-end"));
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it("shows YOU FINISHED N OF 9 with WATCH and END GAME after Level 5 (A44, plan 092)", () => {
    const onWatch = vi.fn();
    render(<ReentryModal available={false} finishPlace={7} onWatch={onWatch} />);
    expect(screen.getByText("YOU FINISHED 7 OF 9")).toBeInTheDocument();
    expect(screen.getAllByRole("button").map((b) => b.textContent)).toEqual(["WATCH TO THE END", "END GAME"]);
    expect(screen.queryByTestId("reentry-new-game")).toBeNull();
    fireEvent.click(screen.getByTestId("reentry-watch"));
    expect(onWatch).toHaveBeenCalledTimes(1);
  });

  it("renders a placeholder finish place when the backend has none yet", () => {
    render(<ReentryModal available={false} />);
    expect(screen.getByText("YOU FINISHED ? OF 9")).toBeInTheDocument();
  });
});

describe("autoFinishActive (A39 BOT auto-finish trigger)", () => {
  it("activates only when the hero is permanently out and BOTs remain", () => {
    expect(autoFinishActive(true, 5, null)).toBe(true);
    expect(autoFinishActive(true, 2, null)).toBe(true);
    expect(autoFinishActive(false, 5, null)).toBe(false); // hero still in
    expect(autoFinishActive(true, 1, null)).toBe(false);   // single survivor
    expect(autoFinishActive(true, 5, "Alex")).toBe(false); // champion exists
  });
});
