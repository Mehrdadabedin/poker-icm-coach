import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createElement, type ComponentType } from "react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type AnalyticsModule = typeof import("../src/analytics");

let analytics: AnalyticsModule;
let AnalyticsConsentBanner: ComponentType;

function queuedCommands(): unknown[][] {
  return (window.dataLayer ?? []).map((command) => Array.from(command));
}

function renderBanner() {
  return render(
    createElement(
      MemoryRouter,
      { initialEntries: ["/login"] },
      createElement(AnalyticsConsentBanner),
    ),
  );
}

beforeEach(async () => {
  vi.resetModules();
  vi.stubEnv("VITE_GA_MEASUREMENT_ID", "G-TEST123");
  window.localStorage.clear();
  document.head.replaceChildren();
  delete window.gtag;
  delete window.dataLayer;

  analytics = await import("../src/analytics");
  ({ AnalyticsConsentBanner } = await import(
    "../src/components/AnalyticsConsentBanner"
  ));
  analytics.initializeGoogleAnalytics();
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  document.head.replaceChildren();
  delete window.gtag;
  delete window.dataLayer;
  vi.unstubAllEnvs();
});

describe("Google Analytics consent", () => {
  it("shows the choice to a new visitor without loading analytics", () => {
    renderBanner();

    expect(screen.getByRole("heading", { name: "Your privacy matters" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Accept analytics" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Reject analytics" })).toBeTruthy();
    expect(document.getElementById("google-analytics")).toBeNull();

    analytics.trackPageView("/login");
    expect(queuedCommands().some((command) => command[0] === "event")).toBe(false);
  });

  it("enables analytics after acceptance and tracks the current page", () => {
    renderBanner();
    fireEvent.click(screen.getByRole("button", { name: "Accept analytics" }));

    expect(window.localStorage.getItem("icmbot.analytics.consent")).toBe("granted");
    expect(document.getElementById("google-analytics")?.getAttribute("src")).toBe(
      "https://www.googletagmanager.com/gtag/js?id=G-TEST123",
    );
    expect(queuedCommands()).toEqual(
      expect.arrayContaining([
        ["consent", "default", expect.objectContaining({ analytics_storage: "denied" })],
        ["consent", "update", expect.objectContaining({ analytics_storage: "granted" })],
        ["config", "G-TEST123", expect.objectContaining({ send_page_view: false })],
        ["event", "page_view", expect.objectContaining({ page_path: "/login" })],
      ]),
    );
    expect(
      queuedCommands().find((command) => command[0] === "event"),
    ).toBeDefined();
  });

  it("persists rejection and does not load or send analytics", () => {
    renderBanner();
    fireEvent.click(screen.getByRole("button", { name: "Reject analytics" }));
    analytics.trackPageView("/table/private-table");

    expect(window.localStorage.getItem("icmbot.analytics.consent")).toBe("denied");
    expect(document.getElementById("google-analytics")).toBeNull();
    expect(queuedCommands().some((command) => command[0] === "event")).toBe(false);
  });

  it("remembers the choice across mounts and lets visitors reopen settings", () => {
    const firstRender = renderBanner();
    fireEvent.click(screen.getByRole("button", { name: "Reject analytics" }));
    firstRender.unmount();

    renderBanner();
    expect(screen.queryByRole("heading", { name: "Your privacy matters" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Cookie settings" }));
    expect(screen.getByRole("button", { name: "Accept analytics" })).toBeTruthy();
  });

  it("redacts table identifiers and omits query parameters after consent", () => {
    analytics.setAnalyticsConsent("granted", "/login");
    document.title = "ICM Master";

    analytics.trackPageView("/table/private-table-id?access_token=secret");

    const pageViews = queuedCommands().filter(
      (command) => command[0] === "event" && command[1] === "page_view",
    );
    expect(pageViews[pageViews.length - 1]).toEqual([
      "event",
      "page_view",
      {
        page_path: "/table/:tableId",
        page_location: "http://localhost:3000/#/table/:tableId",
        page_title: "ICM Master",
      },
    ]);
    expect(JSON.stringify(pageViews)).not.toContain("private-table-id");
    expect(JSON.stringify(pageViews)).not.toContain("secret");
  });
});
