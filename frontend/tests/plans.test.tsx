/* Free and Pro (plan 100): locks, the Upgrade entries, the sheet and Pro-only pages. */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { HomeMenu } from "../src/components/HomeMenu";
import { ProOnly } from "../src/components/ProOnly";
import { UpgradeSheet } from "../src/components/UpgradeSheet";
import { I18nProvider } from "../src/i18n/I18n";
import type { Lang } from "../src/i18n/lang";
import { LearnPage } from "../src/pages/LearnPage";
import { ProfilePage } from "../src/pages/ProfilePage";
import { ReviewPage } from "../src/pages/ReviewPage";
import { resetPlan } from "../src/services/plan";
import { announceProRequired } from "../src/services/proRequired";
import { closeUpgrade } from "../src/services/upgrade";

type Who = { admin: boolean; plan: "free" | "pro" } | "pending";
let who: Who = { admin: false, plan: "free" };
const { getAccount } = vi.hoisted(() => ({ getAccount: vi.fn() }));
vi.mock("../src/services/profileApi", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getAccount,
  getProfile: vi.fn(async () => null),
}));
vi.mock("../src/services/api", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  request: vi.fn(async () => { throw new Error("API 404"); }),
  me: vi.fn(async () => ({ username: "ann" })),
  adminSummary: vi.fn(async () => { throw new Error("API 403"); }),
}));

const PRO_TESTIDS = ["menu-coach", "menu-ranges", "menu-icm-calculator", "menu-mistakes", "menu-history", "menu-report"];

function open(ui: React.ReactNode, lang: Lang = "en", path = "/") {
  return render(
    <I18nProvider initial={lang}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/" element={ui} />
          <Route path="*" element={<div data-testid="elsewhere" />} />
        </Routes>
        <UpgradeSheet />
      </MemoryRouter>
    </I18nProvider>,
  );
}
const settle = () => act(async () => undefined);
const learn = async (lang: Lang = "en") => { open(<LearnPage />, lang); await settle(); };

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("icm_auth_token", "t-1");
  localStorage.setItem("icm_username", "ann");
  who = { admin: false, plan: "free" };
  getAccount.mockReset();
  getAccount.mockImplementation(() => (who === "pending" ? new Promise(() => undefined) : Promise.resolve({ username: "ann", signIn: "password", email: null, ...who })));
  resetPlan();
  closeUpgrade();
});
afterEach(cleanup);

describe("a Free player", () => {
  it("sees a closed lock on the Pro cards, and a tap opens the sheet", async () => {
    await learn();
    for (const id of ["menu-coach", "menu-ranges", "menu-icm-calculator"]) {
      expect(within(screen.getByTestId(id)).getByTestId("lock-closed")).toBeInTheDocument();
    }
    expect(within(screen.getByTestId("menu-glossary")).queryByTestId("lock-closed")).toBeNull();
    fireEvent.click(screen.getByTestId("menu-coach"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.queryByTestId("elsewhere")).toBeNull();
  });

  it("opens the Glossary", async () => {
    await learn();
    fireEvent.click(screen.getByTestId("menu-glossary"));
    expect(screen.getByTestId("elsewhere")).toBeInTheDocument();
  });

  it("locks the three Review cards", async () => {
    open(<ReviewPage />);
    await settle();
    for (const id of ["menu-mistakes", "menu-history", "menu-report"]) {
      expect(within(screen.getByTestId(id)).getByTestId("lock-closed")).toBeInTheDocument();
    }
  });

  it("has an Upgrade entry on Learn, Review, Profile and the phone Home", async () => {
    for (const ui of [<LearnPage key="l" />, <ReviewPage key="r" />, <ProfilePage key="p" />, <HomeMenu key="h" isAdmin={false} phone />]) {
      open(ui);
      await settle();
      expect(screen.getByTestId("upgrade-entry")).toBeInTheDocument();
      cleanup();
      resetPlan();
    }
  });

  it("shows the six Pro cards locked on the wide home", async () => {
    open(<HomeMenu isAdmin={false} />);
    await settle();
    expect(screen.getAllByTestId("lock-closed")).toHaveLength(PRO_TESTIDS.length);
  });

  it("shows the Unlock the ICM coach card on the wide home too", async () => {
    open(<HomeMenu isAdmin={false} />);
    await settle();
    expect(screen.getByTestId("upgrade-entry")).toHaveTextContent("Unlock the ICM coach");
  });

  it("reads in Spanish", async () => {
    await learn("es");
    expect(screen.getByTestId("upgrade-entry")).toHaveTextContent("Mejorar a Pro");
    fireEvent.click(screen.getByTestId("upgrade-entry"));
    expect(screen.getByTestId("upgrade-soon")).toHaveTextContent("Próximamente");
    expect(screen.getByTestId("upgrade-not-now")).toHaveTextContent("Ahora no");
  });
});

describe("an admin", () => {
  it("sees open locks with PRO, opens the pages, and has no Upgrade entry", async () => {
    who = { admin: true, plan: "free" };
    await learn();
    expect(screen.getAllByTestId("lock-open")).toHaveLength(3);
    expect(screen.queryByTestId("lock-closed")).toBeNull();
    expect(within(screen.getByTestId("menu-ranges")).getByText("PRO")).toBeInTheDocument();
    expect(screen.queryByTestId("upgrade-entry")).toBeNull();
    fireEvent.click(screen.getByTestId("menu-ranges"));
    expect(screen.getByTestId("elsewhere")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("has no Unlock card on the wide home", async () => {
    who = { admin: true, plan: "free" };
    open(<HomeMenu isAdmin />);
    await settle();
    expect(screen.queryByTestId("upgrade-entry")).toBeNull();
  });
});

describe("a Pro player, and an unknown plan", () => {
  it("a Pro player sees no locks and no Upgrade entry", async () => {
    who = { admin: false, plan: "pro" };
    await learn();
    expect(screen.queryByTestId("lock-closed")).toBeNull();
    expect(screen.queryByTestId("lock-open")).toBeNull();
    expect(screen.queryByTestId("upgrade-entry")).toBeNull();
  });

  it("shows no locks until the server answered", async () => {
    who = "pending";
    await learn();
    expect(screen.queryByTestId("lock-closed")).toBeNull();
    expect(screen.queryByTestId("upgrade-entry")).toBeNull();
  });
});

describe("ProOnly", () => {
  const page = <ProOnly><div data-testid="the-page" /></ProOnly>;

  it("shows the locked message to a Free player, and the page to Pro", async () => {
    open(page);
    await settle();
    expect(screen.getByTestId("pro-locked")).toBeInTheDocument();
    expect(screen.queryByTestId("the-page")).toBeNull();
    fireEvent.click(screen.getByTestId("pro-locked-upgrade"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    cleanup();
    who = { admin: false, plan: "pro" };
    resetPlan();
    open(page);
    await settle();
    expect(screen.getByTestId("the-page")).toBeInTheDocument();
  });

  it("locks the page when any request answers 402", async () => {
    who = { admin: false, plan: "pro" };
    open(page);
    await settle();
    expect(screen.getByTestId("the-page")).toBeInTheDocument();
    act(() => announceProRequired());
    expect(screen.getByTestId("pro-locked")).toBeInTheDocument();
  });
});
