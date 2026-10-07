/* A04 tests: App routing reaches the Admin page and the ADMIN menu entry is
 * shown only to an Admin (the summary API answers 403 for a normal user). */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";

const { adminSummary } = vi.hoisted(() => ({
  adminSummary: vi.fn(async () => ({
    total_registered_accounts: 0,
    local_accounts: 0,
    google_accounts: 0,
  })),
}));

vi.mock("../src/services/api", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getToken: () => localStorage.getItem("icm_auth_token"),
  getUsername: () => localStorage.getItem("icm_username"),
  clearAuth: () => {
    localStorage.removeItem("icm_auth_token");
    localStorage.removeItem("icm_username");
  },
  me: vi.fn(async () => ({ username: "Mehrdad" })),
  adminSummary,
}));

const flush = async () => act(async () => undefined);

beforeEach(() => {
  localStorage.clear();
  adminSummary.mockReset();
  adminSummary.mockResolvedValue({
    total_registered_accounts: 3,
    local_accounts: 2,
    google_accounts: 1,
  });
});

describe("App routing remains intact (A04)", () => {
  it("builds the Admin page under /admin", async () => {
    localStorage.setItem("icm_auth_token", "t-1");
    localStorage.setItem("icm_username", "Mehrdad");
    window.location.hash = "#/admin";
    const { App } = await import("../src/App");
    render(<App />);
    await flush();
    expect(screen.getByTestId("admin-nav")).toBeInTheDocument();
  });

  it("keeps existing routes working and exposes the ADMIN menu entry for an Admin", async () => {
    localStorage.setItem("icm_auth_token", "t-1");
    localStorage.setItem("icm_username", "Mehrdad");
    window.location.hash = "#/";
    const { App } = await import("../src/App");
    render(<App />);
    await flush();
    expect(screen.getByTestId("home-page")).toBeInTheDocument();
    expect(screen.getByTestId("start-practice")).toBeInTheDocument();
    expect(screen.getByTestId("menu-admin")).toBeInTheDocument();
  });

  it("hides the ADMIN menu entry from a normal user", async () => {
    adminSummary.mockRejectedValue(new Error("API 403: admin access required"));
    localStorage.setItem("icm_auth_token", "t-1");
    localStorage.setItem("icm_username", "Mehrdad");
    window.location.hash = "#/";
    const { App } = await import("../src/App");
    render(<App />);
    await flush();
    expect(screen.getByTestId("home-page")).toBeInTheDocument();
    expect(screen.getByTestId("start-practice")).toBeInTheDocument();
    expect(screen.queryByTestId("menu-admin")).toBeNull();
  });

  it("opens the Admin dashboard when an Admin clicks the menu entry", async () => {
    localStorage.setItem("icm_auth_token", "t-1");
    localStorage.setItem("icm_username", "Mehrdad");
    window.location.hash = "#/";
    const { App } = await import("../src/App");
    render(<App />);
    await flush();
    fireEvent.click(screen.getByTestId("menu-admin"));
    await flush();
    expect(screen.getByTestId("admin-nav")).toBeInTheDocument();
  });
});
