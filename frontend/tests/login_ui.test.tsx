/* Design behaviour of the sign-in screen: provider pills, the notices they
 * show when a provider has no flow, and the password reveal toggle. */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { getAuthProviders } from "../src/services/api";

vi.mock("../src/services/api", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
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
    // one shared error container: .auth-notice is the red status line
    expect(notice).toHaveClass("auth-notice");
  });

  it("renders Google as the only provider pill", async () => {
    await openForm();
    expect(screen.getByTestId("provider-google")).toHaveTextContent("Continue with Google");
    // phone and Apple were removed from this screen
    expect(screen.queryByTestId("provider-phone")).toBeNull();
    expect(screen.queryByTestId("provider-apple")).toBeNull();
    expect(screen.queryByText(/continue with phone/i)).toBeNull();
    expect(screen.queryByText(/continue with apple/i)).toBeNull();
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
