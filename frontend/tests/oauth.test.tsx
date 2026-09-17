import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const saveAuth = vi.fn();

vi.mock("../src/services/api", async () => {
  const actual = await vi.importActual<typeof import("../src/services/api")>("../src/services/api");
  return { ...actual, saveAuth: (...args: unknown[]) => saveAuth(...args) };
});

import { AuthCallbackPage } from "../src/pages/AuthCallbackPage";

/** Renders the OAuth landing route with the given fragment query string. */
function renderCallback(search: string) {
  return render(
    <MemoryRouter initialEntries={[`/auth/callback${search}`]}>
      <Routes>
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/" element={<div data-testid="home-stub">home</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("AuthCallbackPage", () => {
  beforeEach(() => {
    saveAuth.mockClear();
  });

  it("stores the session token and enters the app", async () => {
    renderCallback("?token=abc123&username=neo");
    expect(await screen.findByTestId("home-stub")).toBeInTheDocument();
    expect(saveAuth).toHaveBeenCalledWith("abc123", "neo");
  });

  it("does not store anything when the provider reported an error", async () => {
    renderCallback("?error=google_signin_failed");
    expect(await screen.findByTestId("auth-callback-message")).toHaveTextContent(
      "Sign-in could not be completed",
    );
    expect(saveAuth).not.toHaveBeenCalled();
  });

  it("does not store anything when the token is missing", async () => {
    renderCallback("?username=neo");
    expect(await screen.findByTestId("auth-callback-message")).toBeInTheDocument();
    expect(saveAuth).not.toHaveBeenCalled();
  });
});
