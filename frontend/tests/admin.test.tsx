/* A04/A05 tests: Admin dashboard shell + live user metrics.
 * The backend (A03) is the authorization boundary; the dashboard shows the
 * real summary from GET /api/admin/users/summary, with distinct loading,
 * zero, failure and forbidden states, and never reads users.json. */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AdminPage } from "../src/pages/AdminPage";
import { AuthError } from "../src/services/api";

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

const NAV_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  users: "Users",
  activity: "Poker Activity",
  "bot-profiles": "BOT Profiles",
  future: "Future Admin Sections",
};
const SECTIONS = ["dashboard", "users", "activity", "bot-profiles", "future"];

function renderAdmin(initial = "/admin") {
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <Routes>
        <Route path="/admin/:section?" element={<AdminPage />} />
        <Route path="/" element={<div data-testid="home-page" />} />
        <Route path="/login" element={<div data-testid="login-page" />} />
      </Routes>
    </MemoryRouter>,
  );
}

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

describe("Admin dashboard metrics (A05)", () => {
  it("requests the protected summary API and displays the real counts", async () => {
    renderAdmin();
    await flush();
    expect(adminSummary).toHaveBeenCalledTimes(1);
    const total = screen.getByTestId("metric-total");
    expect(total).toHaveTextContent("Total Registered Accounts");
    expect(total).toHaveTextContent("3");
    expect(screen.getByTestId("metric-google")).toHaveTextContent("1");
    expect(screen.getByTestId("metric-local")).toHaveTextContent("2");
  });

  it("shows a loading state before metrics arrive", async () => {
    adminSummary.mockReturnValue(new Promise(() => undefined));
    renderAdmin();
    expect(screen.getByTestId("admin-loading")).toBeInTheDocument();
    expect(screen.queryByTestId("admin-metrics")).toBeNull();
  });

  it("renders a valid zero count as zero, not as an error", async () => {
    adminSummary.mockResolvedValue({
      total_registered_accounts: 0,
      local_accounts: 0,
      google_accounts: 0,
    });
    renderAdmin();
    await flush();
    expect(screen.queryByTestId("admin-error")).toBeNull();
    expect(screen.getByTestId("metric-total")).toHaveTextContent("0");
    expect(screen.getByTestId("metric-google")).toHaveTextContent("0");
    expect(screen.getByTestId("metric-local")).toHaveTextContent("0");
  });

  it("shows an error state, never fabricated zeros, when the API fails", async () => {
    adminSummary.mockRejectedValue(new Error("API 500: boom"));
    renderAdmin();
    await flush();
    expect(screen.getByTestId("admin-error")).toBeInTheDocument();
    expect(screen.queryByTestId("admin-metrics")).toBeNull();
    expect(screen.queryByText("Total Registered Accounts")).toBeNull();
  });

  it("treats a 403 as admin access required with no Admin UI or user data", async () => {
    adminSummary.mockRejectedValue(new Error("API 403: admin access required"));
    renderAdmin();
    await flush();
    expect(screen.getByTestId("admin-denied")).toHaveTextContent("Admin access required");
    expect(screen.queryByTestId("admin-nav")).toBeNull();
    expect(screen.queryByTestId("admin-metrics")).toBeNull();
    expect(screen.queryByTestId("admin-users-table")).toBeNull();
  });

  it("sends a 401 to login and clears the stale session", async () => {
    localStorage.setItem("icm_auth_token", "stale");
    adminSummary.mockRejectedValue(new AuthError("Authentication required (API 401)"));
    renderAdmin();
    await flush();
    expect(localStorage.getItem("icm_auth_token")).toBeNull();
    expect(screen.getByTestId("login-page")).toBeInTheDocument();
  });

  it("never touches users.json from the frontend", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    renderAdmin();
    await flush();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(screen.queryByText(/users\.json/i)).toBeNull();
    expect(screen.getByTestId("metric-total")).toBeInTheDocument();
    fetchSpy.mockRestore();
  });
});

describe("Admin shell navigation (A04)", () => {
  it("renders the Admin page with all navigation sections", async () => {
    renderAdmin();
    await flush();
    expect(screen.getByTestId("admin-nav")).toBeInTheDocument();
    expect(screen.getByTestId("admin-logout")).toHaveTextContent("LOG OUT");
    for (const id of SECTIONS) {
      expect(screen.getByTestId(`admin-nav-${id}`).textContent).toContain(NAV_LABELS[id]);
    }
  });

  it("keeps section navigation working with metrics visible", async () => {
    renderAdmin();
    await flush();
    fireEvent.click(screen.getByTestId("admin-nav-activity"));
    await flush();
    expect(screen.getByTestId("admin-section-activity")).toBeInTheDocument();
    expect(screen.queryByTestId("admin-metrics")).toBeNull();
    expect(screen.getByTestId("admin-nav-activity").className).toContain("admin-nav-active");
    fireEvent.click(screen.getByTestId("admin-nav-dashboard"));
    await flush();
    expect(screen.getByTestId("admin-metrics")).toBeInTheDocument();
  });

  it("renders the remaining section placeholders", async () => {
    for (const id of ["activity", "bot-profiles", "future"]) {
      renderAdmin(`/admin/${id}`);
      await flush();
      expect(screen.getByTestId(`admin-placeholder-${id}`)).toBeInTheDocument();
    }
  });

  it("falls back to Dashboard for an unknown section", async () => {
    renderAdmin("/admin/nonsense");
    await flush();
    expect(screen.getByTestId("admin-metrics")).toBeInTheDocument();
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
