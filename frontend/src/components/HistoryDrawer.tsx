import { useId, useRef, useState, type KeyboardEvent } from "react";
import type { TableAction } from "../models/game";
import { ActionHistory } from "./ActionHistory";
import { LockedLine } from "./LockedCoach";
import { OverallPerformance, WinLoseAnalysis } from "./WinLoseAnalysis";
import { useDismiss } from "../hooks/useDismiss";
import { useFocusReturn } from "../hooks/useFocusReturn";
import { useTableHands } from "../hooks/useTableHands";
import { useT } from "../i18n/I18n";

const TAB_LABEL = { hand: "drawer.thisHand", last: "drawer.lastHands", position: "drawer.byPosition" } as const;
type Tab = keyof typeof TAB_LABEL;
const TABS: Tab[] = ["hand", "last", "position"];

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
  const [tab, setTab] = useState<Tab>("hand");
  const hands = useTableHands(tableId, handNumber, open && !locked);
  const box = useRef<HTMLDivElement>(null);
  const ids = useId();
  useDismiss(open, onClose);
  useFocusReturn(open, box);
  if (!open) return null;
  // arrow keys, Home and End move between the tabs (the ARIA tabs pattern)
  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    const at = TABS.indexOf(tab);
    const next = { ArrowRight: at + 1, ArrowLeft: at - 1, Home: 0, End: TABS.length - 1 }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    const to = TABS[(next + TABS.length) % TABS.length];
    setTab(to);
    document.getElementById(`${ids}-tab-${to}`)?.focus();
  };
  return (
    <div className={side ? "drawer-scrim drawer-side" : "drawer-scrim"} onClick={onClose} data-testid="history-scrim">
      <div ref={box} className="drawer" role="dialog" aria-modal={!side} aria-label={t("drawer.title")} onClick={(e) => e.stopPropagation()} data-testid="history-drawer">
        <span className="drawer-handle" aria-hidden="true" />
        <div className="drawer-head">
          <div className="drawer-tabs" role="tablist">
            {TABS.map((id) => (
              <button key={id} id={`${ids}-tab-${id}`} type="button" role="tab" aria-selected={tab === id}
                aria-controls={`${ids}-panel`} tabIndex={tab === id ? 0 : -1} className="drawer-tab"
                onClick={() => setTab(id)} onKeyDown={onTabKey} data-testid={`drawer-tab-${id}`}>
                {t(TAB_LABEL[id])}
              </button>
            ))}
          </div>
          <button type="button" className="sheet-x" aria-label={t("strip.close")} onClick={onClose} data-testid="history-close">×</button>
        </div>
        <div className="drawer-body" id={`${ids}-panel`} role="tabpanel" tabIndex={0}
          aria-labelledby={`${ids}-tab-${tab}`}>
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
