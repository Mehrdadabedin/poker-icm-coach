/* The phone tab bar (plan 099): five tabs, where it shows, the tab pages and the Profile tab. */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { I18nProvider } from "../src/i18n/I18n";
import type { Lang } from "../src/i18n/lang";
import { LearnPage } from "../src/pages/LearnPage";
import { ReviewPage } from "../src/pages/ReviewPage";
import { ProfilePage } from "../src/pages/ProfilePage";
import { SetupPage } from "../src/pages/SetupPage";
import { GROUPS } from "../src/components/menuEntries";
import { TabBarHost } from "../src/components/TabBarHost";

const { inApp, admin, profile, portrait } = vi.hoisted(() => ({
  inApp: vi.fn(() => false),
  admin: vi.fn(async (): Promise<unknown> => { throw new Error("API 403"); }),
  profile: vi.fn(async (): Promise<unknown> => null),
  portrait: vi.fn(async (): Promise<unknown> => ({ status: "none", image: null })),
}));
vi.mock("../src/services/platform", async (importOriginal) => ({ ...(await importOriginal<Record<string, unknown>>()), inAndroidApp: inApp }));
vi.mock("../src/services/api", async (importOriginal) => ({ ...(await importOriginal<Record<string, unknown>>()), adminSummary: admin }));
vi.mock("../src/services/profileApi", async (importOriginal) => ({ ...(await importOriginal<Record<string, unknown>>()), getProfile: profile }));
vi.mock("../src/services/portraitApi", async (importOriginal) => ({ ...(await importOriginal<Record<string, unknown>>()), getMyPortrait: portrait }));

const ANA = { firstName: "Ana", lastName: "Lopez", displayName: "Ana", birthday: "1990-05-04", gender: "prefer_not_to_say", genderText: null };
const setWidth = (px: number) => Object.defineProperty(window, "innerWidth", { value: px, configurable: true, writable: true });
const settle = () => act(async () => undefined);

async function open(path: string, lang: Lang = "en") {
  render(
    <I18nProvider initial={lang}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="*" element={<div />} />
          <Route path="/learn" element={<LearnPage />} />
          <Route path="/review" element={<ReviewPage />} />
          <Route path="/setup" element={<SetupPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Routes>
        <TabBarHost />
      </MemoryRouter>
    </I18nProvider>,
  );
  await settle();
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("icm_auth_token", "t-1");
  localStorage.setItem("icm_username", "ana");
  setWidth(360);
  inApp.mockReturnValue(false);
  admin.mockImplementation(async () => { throw new Error("API 403"); });
  profile.mockImplementation(async () => ANA);
  portrait.mockImplementation(async () => ({ status: "none", image: null }));
});
afterEach(() => {
  cleanup();
  setWidth(1024);
});

describe("the five tabs", () => {
  it.each([
    ["en", ["Home", "Learn", "Review", "Setup", "Profile"]],
    ["es", ["Inicio", "Aprender", "Revisar", "Ajustes", "Perfil"]],
  ] as const)("in %s, with their routes", async (lang, labels) => {
    await open("/learn", lang);
    const bar = screen.getByTestId("tab-bar");
    const links = within(bar).getAllByRole("link");
    expect(links.map((a) => a.querySelector(".tab-label")?.textContent)).toEqual([...labels]);
    expect(links.map((a) => a.getAttribute("href"))).toEqual(["/", "/learn", "/review", "/setup", "/profile"]);
  });

  it("marks only the current route's tab, also inside its pages", async () => {
    await open("/review");
    expect(screen.getByTestId("tab-review")).toHaveAttribute("aria-current", "page");
    expect(within(screen.getByTestId("tab-bar")).getAllByRole("link").filter((a) => a.hasAttribute("aria-current"))).toHaveLength(1);
    cleanup();
    await open("/glossary");
    expect(screen.getByTestId("tab-learn")).toHaveAttribute("aria-current", "page");
  });
});

describe("where the bar shows", () => {
  it("shows at 360 px and in the app, hides on a wide screen", async () => {
    await open("/review");
    expect(screen.getByTestId("tab-bar")).toBeInTheDocument();
    expect(document.body).toHaveClass("has-tab-bar");
    cleanup();
    setWidth(1280);
    inApp.mockReturnValue(true);
    await open("/review");
    expect(screen.getByTestId("tab-bar")).toBeInTheDocument();
    cleanup();
    inApp.mockReturnValue(false);
    await open("/review");
    expect(screen.queryByTestId("tab-bar")).toBeNull();
    expect(document.body).not.toHaveClass("has-tab-bar");
  });

  it("hides at the table and when nobody is signed in", async () => {
    await open("/table/abc");
    expect(screen.queryByTestId("tab-bar")).toBeNull();
    cleanup();
    localStorage.clear();
    await open("/");
    expect(screen.queryByTestId("tab-bar")).toBeNull();
  });
});

const idsOf = (labelKey: string) => GROUPS.find((g) => g.label === labelKey)?.entries.map((e) => e.testId) ?? [];
const shown = () => screen.getAllByRole("button").map((b) => b.getAttribute("data-testid")).filter((id) => id?.startsWith("menu-"));

describe("the tab pages", () => {
  it("Learn, Review and Setup list the same cards as the home menu groups", async () => {
    await open("/learn");
    expect(shown()).toEqual(idsOf("home.study"));
    cleanup();
    await open("/review");
    expect(shown()).toEqual(idsOf("home.review"));
    cleanup();
    await open("/setup");
    expect(shown()).toEqual(idsOf("home.setup"));
  });

  it("Setup adds Admin only for admins", async () => {
    await open("/setup");
    expect(screen.queryByTestId("menu-admin")).toBeNull();
    cleanup();
    admin.mockImplementation(async () => ({}));
    await open("/setup");
    expect(screen.getByTestId("menu-admin")).toBeInTheDocument();
  });
});

describe("the Profile tab", () => {
  it("shows a dot and the initial before a profile exists", async () => {
    profile.mockImplementation(async () => null);
    await open("/learn");
    expect(screen.getByTestId("tab-profile-dot")).toBeInTheDocument();
    expect(screen.getByTestId("tab-avatar")).toHaveTextContent("A");
  });

  it("shows the display name's initial without a dot after, and the approved photo when there is one", async () => {
    await open("/learn");
    expect(screen.queryByTestId("tab-profile-dot")).toBeNull();
    expect(screen.getByTestId("tab-avatar")).toHaveTextContent("A");
    cleanup();
    portrait.mockImplementation(async () => ({ status: "approved", image: "data:image/png;base64,AAAA" }));
    await open("/learn");
    expect(screen.getByTestId("tab-avatar").querySelector("img")).toHaveAttribute("src", "data:image/png;base64,AAAA");
  });
});

describe("the Profile page header", () => {
  it("drops HOME when the tab bar shows, and keeps LOG OUT", async () => {
    await open("/profile");
    expect(screen.getByTestId("tab-bar")).toBeInTheDocument();
    expect(screen.queryByTestId("home-btn")).toBeNull();
    expect(screen.getByTestId("logout-btn")).toBeInTheDocument();
  });

  it("keeps HOME on a wide screen, where there is no bar", async () => {
    setWidth(1280);
    await open("/profile");
    expect(screen.queryByTestId("tab-bar")).toBeNull();
    expect(screen.getByTestId("home-btn")).toBeInTheDocument();
  });
});
