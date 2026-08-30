import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HeroControls } from "../src/components/HeroControls";
import { LegalAction } from "../src/models/game";

function actions(list: LegalAction[]): LegalAction[] {
  return list;
}

function renderControls(overrides?: Partial<Parameters<typeof HeroControls>[0]>) {
  const onAction = vi.fn();
  const props = {
    legalActions: actions([
      { kind: "fold" },
      { kind: "check" },
      { kind: "bet", minAmount: 100, maxAmount: 20000 },
      { kind: "all_in" },
    ]),
    toCall: 0,
    pot: 800,
    stack: 20000,
    bigBlind: 100,
    disabled: false,
    onAction,
    ...overrides,
  };
  render(<HeroControls {...props} />);
  return onAction;
}

describe("HeroControls", () => {
  it("renders FOLD and CHECK when no bet to call", () => {
    renderControls();
    expect(screen.getByText("FOLD")).toBeInTheDocument();
    expect(screen.getByText("CHECK")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /CALL/ })).not.toBeInTheDocument();
  });

  it("shows CALL with amount when facing a bet", () => {
    renderControls({
      legalActions: [{ kind: "fold" }, { kind: "call" }, { kind: "raise", minAmount: 1000, maxAmount: 20000 }, { kind: "all_in" }],
      toCall: 350,
    });
    expect(screen.getByText("CALL 350")).toBeInTheDocument();
  });

  it("does not offer CHECK when facing a bet", () => {
    renderControls({
      legalActions: [{ kind: "fold" }, { kind: "call" }, { kind: "raise", minAmount: 1000, maxAmount: 20000 }, { kind: "all_in" }],
      toCall: 350,
    });
    expect(screen.queryByText("CHECK")).not.toBeInTheDocument();
  });

  it("emits fold action", async () => {
    const onAction = renderControls();
    await userEvent.click(screen.getByText("FOLD"));
    expect(onAction).toHaveBeenCalledWith("fold");
  });

  it("emits check action", async () => {
    const onAction = renderControls();
    await userEvent.click(screen.getByText("CHECK"));
    expect(onAction).toHaveBeenCalledWith("check", undefined);
  });

  it("emits all-in with stack", async () => {
    const onAction = renderControls();
    await userEvent.click(screen.getByText("ALL-IN"));
    expect(onAction).toHaveBeenCalledWith("all_in", 20000);
  });

  it("opens bet sizing and confirms amount", async () => {
    const onAction = renderControls();
    await userEvent.click(screen.getByText("BET"));
    const input = screen.getByTestId("bet-amount") as HTMLInputElement;
    expect(input).toBeInTheDocument();
    fireEvent.change(input, { target: { value: "600" } });
    await userEvent.click(screen.getByText("CONFIRM"));
    expect(onAction).toHaveBeenCalledWith("bet", 600);
  });

  it("disables buttons while disabled", () => {
    renderControls({ disabled: true });
    expect((screen.getByText("FOLD") as HTMLButtonElement).disabled).toBe(true);
  });

  it("shows pot, stack and to-call info", () => {
    renderControls();
    expect(screen.getByText("POT 800")).toBeInTheDocument();
    expect(screen.getByText("STACK 20,000")).toBeInTheDocument();
  });

  it("shows min raise hint for raise actions", () => {
    renderControls({
      legalActions: [
        { kind: "fold" },
        { kind: "call" },
        { kind: "raise", minAmount: 1200, maxAmount: 20000 },
        { kind: "all_in" },
      ],
      toCall: 400,
    });
    expect(screen.getByText("MIN RAISE 1,200")).toBeInTheDocument();
  });
});
