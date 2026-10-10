import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const { mockIcmEquities } = vi.hoisted(() => ({
  mockIcmEquities: vi.fn(),
}));

vi.mock("../src/services/icmApi", () => ({
  icmEquities: mockIcmEquities,
}));

import { IcmCalculatorPage } from "../src/pages/IcmCalculatorPage";

describe("IcmCalculatorPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIcmEquities.mockResolvedValue({
      equities: [0.3766, 0.3316, 0.2918],
      method: "exact",
    });
  });

  it("renders default values", () => {
    render(
      <MemoryRouter>
        <IcmCalculatorPage />
      </MemoryRouter>,
    );
    expect(screen.getByTestId("icm-calculator-page")).toBeInTheDocument();
    expect(screen.getByTestId("prize-pool-input")).toHaveValue(1000);
    expect(screen.getByTestId("stack-input-0")).toHaveValue(45000);
    expect(screen.getByTestId("stack-input-1")).toHaveValue(30000);
    expect(screen.getByTestId("stack-input-2")).toHaveValue(20000);
    expect(screen.getByTestId("payout-input-0")).toHaveValue(50);
    expect(screen.getByTestId("payout-input-1")).toHaveValue(30);
    expect(screen.getByTestId("payout-input-2")).toHaveValue(20);
  });

  it("calls icmEquities with correct values on Calculate", async () => {
    render(
      <MemoryRouter>
        <IcmCalculatorPage />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByTestId("calculate-btn"));
    await waitFor(() => {
      expect(mockIcmEquities).toHaveBeenCalledWith(
        [45000, 30000, 20000],
        [0.5, 0.3, 0.2],
      );
    });
  });

  it("shows results with correct calculations", async () => {
    render(
      <MemoryRouter>
        <IcmCalculatorPage />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByTestId("calculate-btn"));
    await waitFor(() => {
      expect(screen.getByTestId("icm-results-table")).toBeInTheDocument();
    });

    const cells1 = screen.getByTestId("icm-row-1").querySelectorAll("td");
    expect(cells1[0]).toHaveTextContent("1");
    expect(cells1[1]).toHaveTextContent("45");
    expect(cells1[2]).toHaveTextContent("47.37");
    expect(cells1[3]).toHaveTextContent("37.66");
    expect(cells1[4]).toHaveTextContent("376.60");
    expect(cells1[5]).toHaveTextContent("-9.71");

    const cells2 = screen.getByTestId("icm-row-2").querySelectorAll("td");
    expect(cells2[1]).toHaveTextContent("30");
    expect(cells2[3]).toHaveTextContent("33.16");
    expect(cells2[5]).toHaveTextContent("1.58");

    const cells3 = screen.getByTestId("icm-row-3").querySelectorAll("td");
    expect(cells3[1]).toHaveTextContent("20");
    expect(cells3[3]).toHaveTextContent("29.18");
    expect(cells3[5]).toHaveTextContent("8.13");
  });

  it("shows error when payouts exceed 100%", async () => {
    render(
      <MemoryRouter>
        <IcmCalculatorPage />
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByTestId("payout-input-0"), {
      target: { value: "60" },
    });
    fireEvent.change(screen.getByTestId("payout-input-1"), {
      target: { value: "40" },
    });
    fireEvent.change(screen.getByTestId("payout-input-2"), {
      target: { value: "30" },
    });

    fireEvent.click(screen.getByTestId("calculate-btn"));

    const errorMsg = screen.getByTestId("error-message");
    expect(errorMsg).toHaveTextContent("Payout percentages cannot exceed 100%");
    expect(mockIcmEquities).not.toHaveBeenCalled();
  });

  it("shows error when API call fails", async () => {
    mockIcmEquities.mockRejectedValue(new Error("Network error"));

    render(
      <MemoryRouter>
        <IcmCalculatorPage />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByTestId("calculate-btn"));

    await waitFor(() => {
      const errorMsg = screen.getByTestId("error-message");
      expect(errorMsg).toHaveTextContent("Could not calculate right now");
      expect(errorMsg).not.toHaveTextContent("Network error");
    });
  });

  it("adds and removes players", async () => {
    render(
      <MemoryRouter>
        <IcmCalculatorPage />
      </MemoryRouter>,
    );
    expect(screen.getByTestId("stack-input-0")).toHaveValue(45000);
    expect(screen.getByTestId("stack-input-2")).toBeInTheDocument();
    expect(screen.queryByTestId("stack-input-3")).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("add-player-btn"));
    await waitFor(() => {
      expect(screen.getByTestId("stack-input-3")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("remove-player-0"));
    await waitFor(() => {
      expect(screen.getByTestId("stack-input-0")).toHaveValue(30000);
    });
  });
});
