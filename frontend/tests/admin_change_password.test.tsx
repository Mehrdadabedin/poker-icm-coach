/* Admin bootstrap first-login tests: forced password-change page and
 * post-login routing driven by the backend-declared flags. */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AdminChangePasswordPage } from "../src/pages/AdminChangePasswordPage";
import { HomePage } from "../src/pages/HomePage";
import { AuthError } from "../src/services/api";

const { login, changePassword, adminSummary } = vi.hoisted(() => ({
  login: vi.fn(async () => ({
    token: "t-1", username: "Admin", admin: true, must_change_password: true,
  })),
  changePassword: vi.fn(async () => ({ changed: true })),
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
  saveAuth: (token: string, username: string) => {
    localStorage.setItem("icm_auth_token", token);
    localStorage.setItem("icm_username", username);
  },
  clearAuth: () => {
    localStorage.removeItem("icm_auth_token");
    localStorage.removeItem("icm_username");
  },
  getAuthProviders: vi.fn(async () => ({ google: false, apple: false, phone: false })),
  me: vi.fn(async () => ({ username: "Admin" })),
  login,
  changePassword,
  adminSummary,
}));

function renderChange() {
  return render(
    <MemoryRouter initialEntries={["/change-password"]}>
      <Routes>
        <Route path="/change-password" element={<AdminChangePasswordPage />} />
        <Route path="/admin" element={<div data-testid="admin-stub" />} />
        <Route path="/login" element={<div data-testid="login-stub" />} />
        <Route path="/" element={<div data-testid="home-stub" />} />
      </Routes>
    </MemoryRouter>,
  );
}

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={["/login"]}>
      <Routes>
        <Route path="/login" element={<HomePage />} />
        <Route path="/admin" element={<div data-testid="admin-stub" />} />
        <Route path="/change-password" element={<div data-testid="change-stub" />} />
      </Routes>
    </MemoryRouter>,
  );
}

const fill = () => {
  fireEvent.change(screen.getByTestId("username-input"), { target: { value: "Admin" } });
  fireEvent.change(screen.getByTestId("password-input"), { target: { value: "whatever" } });
  fireEvent.click(screen.getByTestId("auth-submit"));
};

beforeEach(() => {
  localStorage.clear();
  login.mockReset();
  login.mockResolvedValue({
    token: "t-1", username: "Admin", admin: true, must_change_password: true,
  });
  changePassword.mockReset();
  changePassword.mockResolvedValue({ changed: true });
  adminSummary.mockReset();
  adminSummary.mockResolvedValue({
    total_registered_accounts: 0,
    local_accounts: 0,
    google_accounts: 0,
  });
});

describe("Admin change-password page", () => {
  beforeEach(() => {
    localStorage.setItem("icm_auth_token", "t-1");
    localStorage.setItem("icm_username", "Admin");
  });

  it("shows the temporary-password notice and validates the new password", async () => {
    renderChange();
    expect(screen.getByTestId("change-notice")).toHaveTextContent(/temporary/i);
    fireEvent.change(screen.getByTestId("change-new"), { target: { value: "short" } });
    fireEvent.click(screen.getByTestId("change-submit"));
    expect(screen.getByTestId("change-error")).toHaveTextContent(/at least/i);
    expect(changePassword).not.toHaveBeenCalled();
  });

  it("requires the confirmation to match", async () => {
    renderChange();
    fireEvent.change(screen.getByTestId("change-new"), { target: { value: "NewPass-123" } });
    fireEvent.change(screen.getByTestId("change-confirm"), { target: { value: "other-456" } });
    fireEvent.click(screen.getByTestId("change-submit"));
    expect(screen.getByTestId("change-error")).toHaveTextContent(/do not match/i);
  });

  it("submits the new password and proceeds to the Admin dashboard", async () => {
    renderChange();
    fireEvent.change(screen.getByTestId("change-new"), { target: { value: "NewPass-123" } });
    fireEvent.change(screen.getByTestId("change-confirm"), { target: { value: "NewPass-123" } });
    fireEvent.click(screen.getByTestId("change-submit"));
    await waitFor(() => expect(screen.getByTestId("admin-stub")).toBeInTheDocument());
    expect(changePassword).toHaveBeenCalledWith("NewPass-123");
    expect(screen.getByTestId("admin-stub")).toBeInTheDocument();
  });

  it("surfaces a server rejection and keeps the session", async () => {
    changePassword.mockRejectedValue(new Error("API 400: password must be at least 8 characters"));
    renderChange();
    fireEvent.change(screen.getByTestId("change-new"), { target: { value: "NewPass-123" } });
    fireEvent.change(screen.getByTestId("change-confirm"), { target: { value: "NewPass-123" } });
    fireEvent.click(screen.getByTestId("change-submit"));
    await waitFor(() => expect(screen.getByTestId("change-error")).toBeInTheDocument());
    expect(localStorage.getItem("icm_auth_token")).toBe("t-1");
  });

  it("clears the session and sends a 401 to login", async () => {
    changePassword.mockRejectedValue(new AuthError("Authentication required (API 401)"));
    renderChange();
    fireEvent.change(screen.getByTestId("change-new"), { target: { value: "NewPass-123" } });
    fireEvent.change(screen.getByTestId("change-confirm"), { target: { value: "NewPass-123" } });
    fireEvent.click(screen.getByTestId("change-submit"));
    await waitFor(() => expect(screen.getByTestId("login-stub")).toBeInTheDocument());
    expect(localStorage.getItem("icm_auth_token")).toBeNull();
  });
});

describe("post-login routing from backend flags", () => {
  beforeEach(() => {
    localStorage.clear();
    login.mockReset();
    adminSummary.mockReset();
    adminSummary.mockResolvedValue({
      total_registered_accounts: 0,
      local_accounts: 0,
      google_accounts: 0,
    });
  });

  it("sends a pending-change Admin to the change-password screen", async () => {
    login.mockResolvedValue({
      token: "t-1", username: "Admin", admin: true, must_change_password: true,
    });
    renderLogin();
    fill();
    await waitFor(() => expect(screen.getByTestId("change-stub")).toBeInTheDocument());
  });

  it("sends an Admin with no pending change to the Admin dashboard", async () => {
    login.mockResolvedValue({ token: "t-1", username: "Admin", admin: true, must_change_password: false });
    renderLogin();
    fill();
    await waitFor(() => expect(screen.getByTestId("admin-stub")).toBeInTheDocument());
  });

  it("keeps normal users on the normal dashboard without the ADMIN menu", async () => {
    login.mockResolvedValue({ token: "t-1", username: "Mehrdad", admin: false, must_change_password: false });
    adminSummary.mockRejectedValue(new Error("API 403: admin access required"));
    renderLogin();
    fill();
    await waitFor(() => expect(screen.getByTestId("start-practice")).toBeInTheDocument());
    expect(screen.queryByTestId("menu-admin")).toBeNull();
  });
});
