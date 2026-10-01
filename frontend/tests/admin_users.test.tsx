/* A06 tests: Admin Users view (protected API list + client-side search).
 * Mocks the A03 admin endpoints; asserts only the safe {username, provider}
 * contract is rendered, states are distinct, and no credential material or
 * users.json access ever reaches the UI. */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AdminPage } from "../src/pages/AdminPage";
import type { AdminUserRow } from "../src/services/api";
import { AuthError } from "../src/services/api";

const { adminSummary, adminUsers } = vi.hoisted(() => ({
  adminSummary: vi.fn(async () => ({
    total_registered_accounts: 0,
    local_accounts: 0,
    google_accounts: 0,
  })),
  adminUsers: vi.fn(async (limit?: number, offset?: number) => ({
    users: [] as AdminUserRow[], total: 0, limit: limit ?? 200, offset: offset ?? 0,
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
  adminSummary,
  adminUsers,
}));

const USERS: AdminUserRow[] = [
  { username: "alex", provider: "local" },
  { username: "john@example", provider: "google" },
  { username: "Emma", provider: "google" },
];

function renderUsers() {
  return render(
    <MemoryRouter initialEntries={["/admin/users"]}>
      <Routes>
        <Route path="/admin/:section?" element={<AdminPage />} />
        <Route path="/" element={<div data-testid="home-page" />} />
        <Route path="/login" element={<div data-testid="login-page" />} />
      </Routes>
    </MemoryRouter>,
  );
}

const flush = async () => act(async () => undefined);
const search = () => screen.getByTestId("admin-users-search");

beforeEach(() => {
  localStorage.clear();
  adminSummary.mockReset();
  adminSummary.mockResolvedValue({ total_registered_accounts: 3, local_accounts: 1, google_accounts: 2 });
  adminUsers.mockReset();
  adminUsers.mockResolvedValue({ users: USERS, total: USERS.length, limit: 200, offset: 0 });
});

describe("Admin Users view (A06)", () => {
  it("renders the Users section and requests the protected API", async () => {
    renderUsers();
    await flush();
    expect(adminUsers).toHaveBeenCalledWith(200, 0);
    expect(screen.getByTestId("admin-users-wrap")).toBeInTheDocument();
  });

  it("displays username and provider for local and google accounts", async () => {
    renderUsers();
    await flush();
    expect(screen.getByTestId("admin-user-alex")).toHaveTextContent("Local");
    expect(screen.getByTestId("admin-user-john@example")).toHaveTextContent("Google");
    expect(screen.getByTestId("admin-user-Emma")).toHaveTextContent("Google");
    expect(screen.getAllByText("alex").length).toBeGreaterThan(0);
  });

  it("shows no email column because the API does not supply email", async () => {
    renderUsers();
    await flush();
    expect(screen.queryByText("Email")).toBeNull();
    expect(screen.queryByRole("columnheader", { name: "Email" })).toBeNull();
  });

  it("filters by username case-insensitively with trimmed input", async () => {
    renderUsers();
    await flush();
    fireEvent.change(search(), { target: { value: "  ALEX " } });
    expect(screen.getByTestId("admin-user-alex")).toBeInTheDocument();
    expect(screen.queryByTestId("admin-user-john@example")).toBeNull();
    expect(screen.queryByTestId("admin-user-Emma")).toBeNull();
  });

  it("shows the full list for an empty search", async () => {
    renderUsers();
    await flush();
    fireEvent.change(search(), { target: { value: "   " } });
    for (const row of USERS) {
      expect(screen.getByTestId(`admin-user-${row.username}`)).toBeInTheDocument();
    }
  });

  it("distinguishes no-match from an empty account list", async () => {
    renderUsers();
    await flush();
    fireEvent.change(search(), { target: { value: "zzz" } });
    expect(screen.getByTestId("admin-users-nomatch")).toHaveTextContent("No users found.");
    expect(screen.queryByTestId("admin-users-table")).toBeNull();
  });

  it("shows a loading state before data arrives", async () => {
    adminUsers.mockReturnValue(new Promise(() => undefined));
    renderUsers();
    await flush(); // page probe resolves and the Users view mounts
    expect(screen.getByTestId("admin-users-loading")).toBeInTheDocument();
    expect(screen.queryByTestId("admin-users-table")).toBeNull();
  });

  it("shows an error state, not an empty list, when the API fails", async () => {
    adminUsers.mockRejectedValue(new Error("API 500: boom"));
    renderUsers();
    await flush();
    expect(screen.getByTestId("admin-users-error")).toBeInTheDocument();
    expect(screen.queryByTestId("admin-users-empty")).toBeNull();
    expect(screen.queryByTestId("admin-users-table")).toBeNull();
  });

  it("treats a valid empty list as empty, not as an error", async () => {
    adminUsers.mockResolvedValue({ users: [], total: 0, limit: 200, offset: 0 });
    renderUsers();
    await flush();
    expect(screen.getByTestId("admin-users-empty")).toHaveTextContent("No registered users.");
    expect(screen.queryByTestId("admin-users-error")).toBeNull();
  });

  it("sends a 401 to login and clears the stale session", async () => {
    localStorage.setItem("icm_auth_token", "stale");
    adminUsers.mockRejectedValue(new AuthError("Authentication required (API 401)"));
    renderUsers();
    await flush();
    expect(localStorage.getItem("icm_auth_token")).toBeNull();
    expect(screen.getByTestId("login-page")).toBeInTheDocument();
  });

  it("handles a 403 from the users API as an error state", async () => {
    adminUsers.mockRejectedValue(new Error("API 403: admin access required"));
    renderUsers();
    await flush();
    expect(screen.getByTestId("admin-users-error")).toBeInTheDocument();
    expect(screen.queryByTestId("admin-users-table")).toBeNull();
  });

  it("never exposes credentials and never touches users.json", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    renderUsers();
    await flush();
    expect(fetchSpy).not.toHaveBeenCalled();
    for (const forbidden of ["password", "hash", "salt", "token", "oauth", "users.json"]) {
      expect(screen.queryByText(new RegExp(forbidden, "i"))).toBeNull();
    }
    fetchSpy.mockRestore();
  });

  it("keeps dashboard metrics and other sections working after Users", async () => {
    renderUsers();
    await flush();
    fireEvent.click(screen.getByTestId("admin-nav-dashboard"));
    await flush();
    expect(screen.getByTestId("metric-total")).toHaveTextContent("3");
    fireEvent.click(screen.getByTestId("admin-nav-activity"));
    await flush();
    expect(screen.getByTestId("admin-placeholder-activity")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("admin-nav-users"));
    await flush();
    expect(screen.getByTestId("admin-users-wrap")).toBeInTheDocument();
  });
});
