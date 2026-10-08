/* Admin Users moderation: status column, Suspend / Unsuspend / Delete.
 * Mocks the admin API; asserts the table updates in place, Delete asks first,
 * backend refusals reach the admin as text, and admins and the signed-in
 * user get no buttons. Also covers the suspended Google sign-in message. */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AdminPage } from "../src/pages/AdminPage";
import { AuthCallbackPage } from "../src/pages/AuthCallbackPage";
import type { AdminUserRow } from "../src/services/api";

const api = vi.hoisted(() => ({
  adminSummary: vi.fn(async () => ({ total_registered_accounts: 0, local_accounts: 0, google_accounts: 0 })),
  adminUsers: vi.fn(),
  logout: vi.fn(async () => ({ ok: true })),
  suspendUser: vi.fn(async () => ({ suspended: true })),
  unsuspendUser: vi.fn(async () => ({ suspended: false })),
  deleteUser: vi.fn(async () => ({ deleted: true })),
}));

vi.mock("../src/services/api", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getToken: () => "token",
  getUsername: () => "Admin",
  adminSummary: api.adminSummary,
  adminUsers: api.adminUsers,
  logout: api.logout,
}));

vi.mock("../src/services/adminApi", () => ({
  suspendUser: api.suspendUser,
  unsuspendUser: api.unsuspendUser,
  deleteUser: api.deleteUser,
}));

const USERS: AdminUserRow[] = [
  { username: "Admin", provider: "local", suspended: false, admin: true },
  { username: "alex", provider: "local", suspended: false, admin: false },
  { username: "emma", provider: "google", suspended: true, admin: false },
];

const flush = async () => act(async () => undefined);

async function renderUsers() {
  render(
    <MemoryRouter initialEntries={["/admin/users"]}>
      <Routes>
        <Route path="/admin/:section?" element={<AdminPage />} />
      </Routes>
    </MemoryRouter>,
  );
  await flush();
  await flush();
}

beforeEach(() => {
  vi.clearAllMocks();
  api.adminUsers.mockResolvedValue({ users: USERS, total: USERS.length, limit: 200, offset: 0 });
});

describe("admin user moderation", () => {
  it("shows each status and offers no actions on admins or yourself", async () => {
    await renderUsers();
    expect(screen.getByTestId("admin-status-alex").textContent).toBe("Active");
    expect(screen.getByTestId("admin-status-emma").textContent).toBe("Suspended");
    expect(screen.getByTestId("admin-user-Admin").textContent).toContain("Protected");
    expect(screen.queryByTestId("admin-suspend-Admin")).toBeNull();
    expect(screen.queryByTestId("admin-delete-Admin")).toBeNull();
    expect(screen.getByTestId("admin-unsuspend-emma")).toBeTruthy();
  });

  it("suspends and unsuspends in place", async () => {
    await renderUsers();
    fireEvent.click(screen.getByTestId("admin-suspend-alex"));
    await flush();
    expect(api.suspendUser).toHaveBeenCalledWith("alex");
    expect(screen.getByTestId("admin-status-alex").textContent).toBe("Suspended");

    fireEvent.click(screen.getByTestId("admin-unsuspend-alex"));
    await flush();
    expect(api.unsuspendUser).toHaveBeenCalledWith("alex");
    expect(screen.getByTestId("admin-status-alex").textContent).toBe("Active");
  });

  it("deletes only after the admin confirms", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValueOnce(false);
    await renderUsers();
    fireEvent.click(screen.getByTestId("admin-delete-alex"));
    await flush();
    expect(api.deleteUser).not.toHaveBeenCalled();
    expect(screen.getByTestId("admin-user-alex")).toBeTruthy();

    confirm.mockReturnValueOnce(true);
    fireEvent.click(screen.getByTestId("admin-delete-alex"));
    await flush();
    expect(confirm).toHaveBeenLastCalledWith("Delete alex? This cannot be undone.");
    expect(api.deleteUser).toHaveBeenCalledWith("alex");
    expect(screen.queryByTestId("admin-user-alex")).toBeNull();
    confirm.mockRestore();
  });

  it("shows the backend's reason when it refuses", async () => {
    api.suspendUser.mockRejectedValueOnce(
      new Error('API 400: {"detail":"admin accounts cannot be suspended or deleted"}'),
    );
    await renderUsers();
    fireEvent.click(screen.getByTestId("admin-suspend-alex"));
    await flush();
    expect(screen.getByTestId("admin-users-action-error").textContent).toBe(
      "Could not update alex: admin accounts cannot be suspended or deleted",
    );
    expect(screen.getByTestId("admin-status-alex").textContent).toBe("Active");
  });
});

describe("suspended Google sign-in", () => {
  it("says the account is suspended instead of a generic failure", async () => {
    render(
      <MemoryRouter initialEntries={["/auth/callback?error=account_suspended"]}>
        <Routes>
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
        </Routes>
      </MemoryRouter>,
    );
    await flush();
    expect(screen.getByTestId("auth-callback-message").textContent).toBe("This account is suspended.");
  });
});
