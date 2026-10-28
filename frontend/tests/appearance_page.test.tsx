/* APPEARANCE has its own SETUP card and page (plan 103, the owner on 28 Oct):
 * it is a choice kept on this device, so it is not part of the tournament
 * settings or the account, and it shows in one place only. */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { I18nProvider } from "../src/i18n/I18n";
import type { Lang } from "../src/i18n/lang";
import { AppearancePage } from "../src/pages/AppearancePage";
import { SettingsPage } from "../src/pages/SettingsPage";
import { SetupPage } from "../src/pages/SetupPage";
import { HomeMenu } from "../src/components/HomeMenu";
import { currentTab } from "../src/components/TabBar";
import { SETUP } from "../src/components/menuEntries";

vi.mock("../src/services/api", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  adminSummary: vi.fn(async () => { throw new Error("API 403"); }),
  request: vi.fn(async () => ({ tableId: null })),
}));

const settle = () => act(async () => undefined);

async function open(path: string, lang: Lang = "en") {
  render(
    <I18nProvider initial={lang}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/appearance" element={<AppearancePage />} />
          <Route path="/setup" element={<SetupPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/" element={<HomeMenu isAdmin={false} />} />
        </Routes>
      </MemoryRouter>
    </I18nProvider>,
  );
  await settle();
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("icm_auth_token", "t-1");
  localStorage.setItem("icm_username", "ana");
  document.documentElement.removeAttribute("data-theme");
});
afterEach(cleanup);

describe("the Appearance card", () => {
  it("is a SETUP card between Tournament settings and Your profile", () => {
    expect(SETUP.map((entry) => entry.to)).toEqual(["/settings", "/appearance", "/profile"]);
  });

  it("shows on the phone's Setup tab and in the wide home menu's SETUP group", async () => {
    await open("/setup");
    expect(screen.getByTestId("menu-appearance")).toHaveTextContent("Appearance");
    cleanup();
    await open("/");
    const setup = screen.getByRole("region", { name: "SETUP" });
    expect(within(setup).getByTestId("menu-appearance")).toHaveTextContent("Dark, light or the same as your phone");
  });

  it("opens its page, which keeps the Setup tab current", async () => {
    await open("/setup");
    fireEvent.click(screen.getByTestId("menu-appearance"));
    expect(screen.getByTestId("appearance-page")).toBeInTheDocument();
    expect(currentTab("/appearance")).toBe("setup");
  });
});

describe("the Appearance page", () => {
  it.each([["en", "Appearance"], ["es", "Apariencia"]] as const)("is titled in %s and names the three choices by its heading", async (lang, title) => {
    await open("/appearance", lang);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(title);
    expect(screen.getByRole("radiogroup", { name: title })).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(3);
    expect(screen.queryByRole("heading", { level: 3 })).toBeNull();
  });

  it("changes the look from there", async () => {
    await open("/appearance");
    fireEvent.click(screen.getByTestId("theme-light"));
    expect(document.documentElement.dataset.theme).toBe("light");
  });
});

describe("only one place", () => {
  it.each(["/setup", "/settings"])("%s no longer carries the picker", async (path) => {
    await open(path);
    expect(screen.queryByTestId("appearance-picker")).toBeNull();
  });
});
