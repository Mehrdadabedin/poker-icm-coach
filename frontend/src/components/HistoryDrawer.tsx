import { useState } from "react";
import type { TableAction } from "../models/game";
import { ActionHistory } from "./ActionHistory";
import { LockedLine } from "./LockedCoach";
import { OverallPerformance, WinLoseAnalysis } from "./WinLoseAnalysis";
import { useDismiss } from "../hooks/useDismiss";
import { useTableHands } from "../hooks/useTableHands";
import { useT } from "../i18n/I18n";

const TAB_LABEL = { hand: "drawer.thisHand", last: "drawer.lastHands", position: "drawer.byPosition" } as const;

interface HistoryDrawerProps {
  open: boolean;
  onClose: () => void;
  actions: TableAction[];
  heroSeat: number;
  nameBySeat: Map<number, string>;
  tableId: string;
  handNumber: number;
  /** Free plan: the completed hands are Pro */
  locked: boolean;
  /** Wide screens: a panel over the right of the table, without a dimmed page (plan 106) */
  side?: boolean;
  currentLevel?: number;
}

/** The hand history from the bottom of an upright phone (plan 101): this hand's
 * actions and the last hands. It closes with its button, a tap outside, Escape
 * and the Android back button. */
export function HistoryDrawer({ open, onClose, actions, heroSeat, nameBySeat, tableId, handNumber, locked, side = false, currentLevel }: HistoryDrawerProps) {
  const t = useT();
  const [tab, setTab] = useState<"hand" | "last" | "position">("hand");
  const hands = useTableHands(tableId, handNumber, open && !locked);
  useDismiss(open, onClose);
  if (!open) return null;
  return (
    <div className={side ? "drawer-scrim drawer-side" : "drawer-scrim"} onClick={onClose} data-testid="history-scrim">
      <div className="drawer" role="dialog" aria-modal={!side} aria-label={t("drawer.title")} onClick={(e) => e.stopPropagation()} data-testid="history-drawer">
        <span className="drawer-handle" aria-hidden="true" />
        <div className="drawer-head">
          <div className="drawer-tabs" role="tablist">
            {(["hand", "last", "position"] as const).map((id) => (
              <button key={id} type="button" role="tab" aria-selected={tab === id} className="drawer-tab"
                onClick={() => setTab(id)} data-testid={`drawer-tab-${id}`}>
                {t(TAB_LABEL[id])}
              </button>
            ))}
          </div>
          <button type="button" className="sheet-x" aria-label={t("strip.close")} onClick={onClose} data-testid="history-close">×</button>
        </div>
        <div className="drawer-body">
          {tab === "hand" ? (
            <ActionHistory actions={actions} heroSeat={heroSeat} nameBySeat={nameBySeat} />
          ) : locked ? <LockedLine /> : tab === "last" ? (
            <OverallPerformance hands={hands ?? []} loading={hands === null} />
          ) : <WinLoseAnalysis hands={hands ?? []} currentLevel={currentLevel} loading={hands === null} />}
        </div>
      </div>
    </div>
  );
}
