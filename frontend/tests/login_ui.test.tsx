/* Design behaviour of the sign-in screen: provider pills, the notices they
 * show when a provider has no flow, and the password reveal toggle. */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { getAuthProviders } from "../src/services/api";

vi.mock("../src/services/api", () => ({
  getToken: vi.fn(() => null),
  getUsername: vi.fn(() => null),
  saveAuth: vi.fn(),
  clearAuth: vi.fn(),
  register: vi.fn(async (username: string) => ({ username, registered: true, token: "reg" })),
  login: vi.fn(async (username: string) => ({ token: "t", username })),
  logout: vi.fn(async () => ({ ok: true })),
  me: vi.fn(async () => ({ username: "Mehrdad" })),
  getAuthProviders: vi.fn(async () => ({ google: false, apple: false, phone: false })),
  googleSignInUrl: vi.fn(() => "https://api.test/api/auth/google/start"),
  AuthError: class AuthError extends Error {},
  createTournament: vi.fn(),
  getState: vi.fn(),
  sendAction: vi.fn(),
  nextHand: vi.fn(),
  coachAdvice: vi.fn(),
  coachCompare: vi.fn(),
  rangeGrid: vi.fn(),
  request: vi.fn(),
}));

async function openForm() {
  const { LoginForm } = await import("../src/components/LoginForm");
  render(
    <MemoryRouter>
      <LoginForm onLogin={() => undefined} />
    </MemoryRouter>,
  );
  // flush the provider lookup so its state update lands inside act()
  await act(async () => undefined);
  return screen;
}

/** Google availability decides which notice wording the pills use. */
function setGoogle(available: boolean) {
  vi.mocked(getAuthProviders).mockResolvedValue({
    google: available,
    apple: false,
    phone: false,
  });
}

describe("provider pills", () => {
  beforeEach(() => {
    localStorage.clear();
    // call counts must not leak between tests, implementations must stay
    vi.clearAllMocks();
    setGoogle(false);
  });

  it("asks the backend once which providers are configured", async () => {
    await openForm();
    await waitFor(() => {
      expect(getAuthProviders).toHaveBeenCalledTimes(1);
    });
  });

  it("toggles the password field between hidden and visible text", async () => {
    await openForm();
    const field = screen.getByTestId("password-input");
    expect(field).toHaveAttribute("type", "password");
    fireEvent.click(screen.getByTestId("password-toggle"));
    expect(screen.getByTestId("password-input")).toHaveAttribute("type", "text");
    expect(screen.getByTestId("password-toggle")).toHaveAttribute("aria-label", "Hide password");
    fireEvent.click(screen.getByTestId("password-toggle"));
    expect(screen.getByTestId("password-input")).toHaveAttribute("type", "password");
    expect(screen.getByTestId("password-toggle")).toHaveAttribute("aria-label", "Show password");
  });

  it("shows the Google notice as an error in red when Google is not configured", async () => {
    await openForm();
    fireEvent.click(screen.getByTestId("provider-google"));
    const notice = screen.getByTestId("provider-notice");
    expect(notice).toHaveTextContent(
      "Google sign-in isn't available yet. For now, you can sign in with your username and password.",
    );
    // the red is the .auth-notice-error rule; the notice box itself is unchanged
    expect(notice).toHaveClass("auth-notice", "auth-notice-error");
  });

  it("shows the Apple notice without a Google clause when Google is absent", async () => {
    await openForm();
    fireEvent.click(screen.getByTestId("provider-apple"));
    const notice = screen.getByTestId("provider-notice");
    expect(notice).toHaveTextContent(
      "Apple sign-in isn't available yet. For now, you can create an account with Sign up.",
    );
    expect(notice).not.toHaveTextContent("Google");
    expect(notice).not.toHaveClass("auth-notice-error");
  });

  it("shows the phone notice naming the SMS configuration gap", async () => {
    await openForm();
    fireEvent.click(screen.getByTestId("provider-phone"));
    const notice = screen.getByTestId("provider-notice");
    expect(notice).toHaveTextContent(
      "Phone sign-in isn't available yet. SMS verification requires additional service configuration.",
    );
    expect(notice).toHaveTextContent("you can create an account with Sign up");
    expect(notice).not.toHaveTextContent("Google");
  });

  it("offers Google in the Apple notice once Google is configured", async () => {
    setGoogle(true);
    await openForm();
    // wait for the provider lookup to land, otherwise the click reads no-provider
    await waitFor(() => {
      expect(getAuthProviders).toHaveBeenCalledTimes(1);
    });
    fireEvent.click(screen.getByTestId("provider-apple"));
    await waitFor(() => {
      expect(screen.getByTestId("provider-notice")).toHaveTextContent(
        "Apple sign-in isn't available yet. For now, you can create an account with Sign up or continue with Google.",
      );
    });
  });

  it("sends the browser to the Google flow when Google is configured", async () => {
    let navigatedTo = "";
    vi.stubGlobal("location", {
      get href() {
        return navigatedTo;
      },
      set href(url: string) {
        navigatedTo = url;
      },
    });
    setGoogle(true);
    await openForm();
    await waitFor(() => {
      expect(getAuthProviders).toHaveBeenCalled();
    });
    fireEvent.click(screen.getByTestId("provider-google"));
    await waitFor(() => {
      expect(navigatedTo).toBe("https://api.test/api/auth/google/start");
    });
    expect(screen.queryByTestId("provider-notice")).toBeNull();
  });
});
