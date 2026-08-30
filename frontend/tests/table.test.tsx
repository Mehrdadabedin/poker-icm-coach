import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { PokerTable } from "../src/components/PokerTable";
import { TablePage } from "../src/pages/TablePage";
import { sampleTableState } from "../src/sampleState";

describe("PokerTable", () => {
  it("renders nine seats", () => {
    render(<PokerTable state={sampleTableState()} />);
    for (let i = 0; i < 9; i++) {
      expect(screen.getByTestId(`seat-${i}`)).toBeInTheDocument();
    }
  });

  it("shows hero hole cards", () => {
    render(<PokerTable state={sampleTableState()} />);
    expect(screen.getByTestId("card-As")).toBeInTheDocument();
    expect(screen.getByTestId("card-Kh")).toBeInTheDocument();
  });

  it("shows community cards and pot", () => {
    render(<PokerTable state={sampleTableState()} />);
    expect(screen.getByTestId("card-9c")).toBeInTheDocument();
    expect(screen.getByTestId("card-Jd")).toBeInTheDocument();
    expect(screen.getByTestId("pot-amount")).toHaveTextContent("POT 3,400");
  });

  it("marks the dealer seat", () => {
    render(<PokerTable state={sampleTableState(0, 8)} />);
    expect(screen.getByTestId("dealer-8")).toBeInTheDocument();
  });

  it("marks the current actor seat as active", () => {
    const state = { ...sampleTableState(), currentActor: 4 };
    render(<PokerTable state={state} />);
    expect(screen.getByTestId("seat-4")).toHaveAttribute("data-active", "true");
    expect(screen.getByTestId("seat-3")).toHaveAttribute("data-active", "false");
  });

  it("highlights the hero seat", () => {
    render(<PokerTable state={sampleTableState()} />);
    expect(screen.getByTestId("seat-0").className).toContain("seat-hero");
  });

  it("shows chip stacks and BB", () => {
    render(<PokerTable state={sampleTableState()} />);
    expect(screen.getByTestId("seat-4")).toHaveTextContent("5,100");
    expect(screen.getByTestId("seat-4")).toHaveTextContent("51 BB");
  });
});

describe("TablePage", () => {
  it("renders the screen with title", () => {
    render(<TablePage state={sampleTableState()} onAction={() => undefined} />);
    expect(screen.getByText("POKER ICM COACH")).toBeInTheDocument();
  });
});
