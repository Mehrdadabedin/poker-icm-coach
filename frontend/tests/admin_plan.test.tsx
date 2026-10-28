/* Admin > Users: the Free / Pro switch (plan 100). */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AdminPage } from "../src/pages/AdminPage";
import type { AdminUserRow } from "../src/services/api";

const api = vi.hoisted(() => ({
  adminUsers: vi.fn(),
  setUserPlan: vi.fn(async (username: string, plan: string) => ({ username, plan })),
}));

vi.mock("../src/services/api", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getToken: () => "token",
  getUsername: () => "Admin",
  adminSummary: vi.fn(async () => ({ total_registered_accounts: 0, local_accounts: 0, google_accounts: 0 })),
  adminUsers: api.adminUsers,
}));
vi.mock("../src/services/adminApi", () => ({ setUserPlan: api.setUserPlan }));

const USERS: AdminUserRow[] = [
  { username: "Admin", provider: "local", suspended: false, admin: true, plan: "free" },
  { username: "alex", provider: "local", suspended: false, admin: false, plan: "free" },
  { username: "emma", provider: "google", suspended: false, admin: false, plan: "pro" },
];

const flush = () => act(async () => undefined);

async function open() {
  render(
    <MemoryRouter initialEntries={["/admin/users"]}>
      <Routes><Route path="/admin/:section?" element={<AdminPage />} /></Routes>
    </MemoryRouter>,
  );
  await flush();
  await flush();
}

beforeEach(() => {
  vi.clearAllMocks();
  api.adminUsers.mockResolvedValue({ users: USERS, total: USERS.length, limit: 200, offset: 0 });
});

describe("the plan switch in Admin Users", () => {
  it("shows each user's plan, and no switch for an admin", async () => {
    await open();
    expect(screen.getByTestId("admin-plan-alex")).toHaveTextContent("Free");
    expect(screen.getByTestId("admin-plan-alex")).toHaveAttribute("aria-checked", "false");
    expect(screen.getByTestId("admin-plan-emma")).toHaveTextContent("Pro");
    expect(screen.queryByTestId("admin-plan-Admin")).toBeNull();
    expect(screen.getByTestId("admin-user-Admin")).toHaveTextContent("Pro (admin)");
  });

  it("sets Pro through the API and updates the row in place", async () => {
    await open();
    fireEvent.click(screen.getByTestId("admin-plan-alex"));
    await flush();
    expect(api.setUserPlan).toHaveBeenCalledWith("alex", "pro");
    expect(screen.getByTestId("admin-plan-alex")).toHaveTextContent("Pro");
    fireEvent.click(screen.getByTestId("admin-plan-emma"));
    await flush();
    expect(api.setUserPlan).toHaveBeenCalledWith("emma", "free");
    expect(screen.getByTestId("admin-plan-emma")).toHaveTextContent("Free");
  });

  it("keeps the old plan and says so when the server refuses", async () => {
    api.setUserPlan.mockRejectedValueOnce(new Error("API 403"));
    await open();
    fireEvent.click(screen.getByTestId("admin-plan-alex"));
    await flush();
    expect(screen.getByTestId("admin-plan-alex")).toHaveTextContent("Free");
    expect(screen.getByTestId("admin-users-action-error")).toHaveTextContent("Could not change the plan of alex");
  });
});
