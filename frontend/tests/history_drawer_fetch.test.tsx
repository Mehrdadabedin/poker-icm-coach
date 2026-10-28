/* A18, moved from the old table sidebar to the history drawer (plans 101, 106):
 * the completed hands are fetched once per hand, never on the 350 ms table
 * poll or on a tab switch. Read-only GETs, but one per poll flooded the server. */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { I18nProvider } from "../src/i18n/I18n";
import { HistoryDrawer } from "../src/components/HistoryDrawer";
import type { TableAction } from "../src/models/game";

const { request } = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("../src/services/api", async (importOriginal) => ({ ...(await importOriginal<Record<string, unknown>>()), request }));

const actions: TableAction[] = [];
const names = new Map<number, string>([[2, "Bot 2"]]);

const drawer = (handNumber: number, open = true) => (
  <I18nProvider initial="en">
    <HistoryDrawer open={open} onClose={() => undefined} actions={actions} heroSeat={0} nameBySeat={names}
      tableId="t-1" handNumber={handNumber} locked={false} side currentLevel={1} />
  </I18nProvider>
);
const handsCalls = () => request.mock.calls.filter(([path]) => String(path).includes("/hands"));

beforeEach(() => {
  request.mockReset();
  request.mockResolvedValue({ hands: [] });
});
afterEach(cleanup);

describe("the history drawer's completed hands (A18)", () => {
  it("fetches once per hand, not per poll or tab switch, and again for a new hand", async () => {
    const { rerender, getByTestId } = render(drawer(2));
    await waitFor(() => expect(handsCalls()).toHaveLength(1));
    expect(handsCalls()[0][0]).toBe("/api/game/t-1/hands");

    rerender(drawer(2)); // the 350 ms poll, same hand
    rerender(drawer(2));
    fireEvent.click(getByTestId("drawer-tab-last"));
    fireEvent.click(getByTestId("drawer-tab-position"));
    fireEvent.click(getByTestId("drawer-tab-hand"));
    await waitFor(() => expect(handsCalls()).toHaveLength(1));

    rerender(drawer(3)); // a hand completed
    await waitFor(() => expect(handsCalls()).toHaveLength(2));
  });

  it("does not fetch while it is closed", () => {
    render(drawer(2, false));
    expect(handsCalls()).toHaveLength(0);
  });
});
