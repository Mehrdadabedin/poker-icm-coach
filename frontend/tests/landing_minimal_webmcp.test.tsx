/* The landing page's WebMCP tools moved with the landing page (plan 069): the
 * minimal page at / registers watch_demo, start_training and explain_icm, and
 * they act on this page (its demo section, the sign-in route). */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { installModelContext, restoreModelContext } from "./webmcp_fixture";

vi.mock("../src/services/api", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getAuthProviders: vi.fn(async () => ({ google: false, apple: false, phone: false })),
}));

beforeEach(() => {
  localStorage.clear();
  Element.prototype.scrollIntoView = () => undefined;
});
afterEach(restoreModelContext);

describe("minimal landing page WebMCP tools", () => {
  it("registers the three landing tools and runs them on this page", async () => {
    const { tools } = installModelContext();
    window.location.hash = "#/";
    const { App } = await import("../src/App");
    render(<App />);
    await act(async () => undefined);
    expect(screen.getByTestId("minimal-landing-page")).toBeInTheDocument();
    expect(tools.map((tool) => tool.name)).toEqual(["watch_demo", "start_training", "explain_icm"]);

    const byName = (name: string) => tools.find((tool) => tool.name === name)!;
    let watched: unknown;
    await act(async () => { watched = await byName("watch_demo").execute({}); });
    expect(watched).toMatchObject({ ok: true, target: "lm-demo" });
    expect(screen.getByTestId("minimal-video")).toBeInTheDocument();

    expect(await byName("explain_icm").execute({})).toMatchObject({ recommendedAction: "FOLD" });

    await act(async () => { await byName("start_training").execute({}); });
    expect(window.location.hash).toBe("#/login");
  });
});
