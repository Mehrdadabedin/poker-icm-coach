/* The footer shows the version the backend reports, and nothing when the
 * backend is unreachable: the app never invents a version of its own. */
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const health = vi.fn();
vi.mock("../src/services/api", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  health: (...args: unknown[]) => health(...args),
}));

const { Copyright } = await import("../src/components/Copyright");

describe("footer version", () => {
  it("shows the version reported by /api/health", async () => {
    health.mockResolvedValueOnce({ status: "ok", version: "1.4.0" });
    render(<Copyright />);
    await waitFor(() => expect(screen.getByTestId("app-version")).toHaveTextContent("v1.4.0"));
  });

  it("shows no version when the backend is unreachable", async () => {
    health.mockRejectedValueOnce(new Error("offline"));
    render(<Copyright />);
    await waitFor(() => expect(health).toHaveBeenCalled());
    expect(screen.queryByTestId("app-version")).toBeNull();
  });
});
