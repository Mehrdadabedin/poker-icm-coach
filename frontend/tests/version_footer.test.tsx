/* The footer is a static copyright line. The version it used to print from
 * /api/health was removed with the rest of the version text (A23), so the footer
 * must not ask the backend for one either. */
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const health = vi.fn();
vi.mock("../src/services/api", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  health: (...args: unknown[]) => health(...args),
}));

const { Copyright } = await import("../src/components/Copyright");

describe("footer copyright", () => {
  it("shows the NEXORA line and no version", () => {
    render(<Copyright />);
    const footer = screen.getByTestId("app-footer");
    expect(footer).toHaveTextContent("© 2026 NEXORA — Created by Mehrdad Abedin");
    expect(screen.queryByTestId("app-version")).toBeNull();
    expect(footer).not.toHaveTextContent("v0.");
  });

  it("does not ask the backend for a version", () => {
    render(<Copyright />);
    expect(health).not.toHaveBeenCalled();
  });
});
