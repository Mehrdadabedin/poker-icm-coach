import type { ActionKind, CoachAdvice, TableState } from "../models/game";
import { HandResult } from "./HandResult";
import { HandReview } from "./HandReview";
import { HeroControls } from "./HeroControls";
import { useIsFree } from "../services/plan";
import { LockedCoachChip } from "./LockedCoach";
import { MobileCoachCard } from "./MobileCoachCard";
import { BotKey } from "./BotKey";
import { CoachStrip } from "./CoachStrip";
import { HistoryDrawer } from "./HistoryDrawer";
import { TableChips } from "./TableChips";
import { usePhoneTable } from "../hooks/usePhoneTable";
import { useUprightPhone } from "../hooks/useUprightPhone";
import { PokerTable } from "./PokerTable";
import { TableHeader } from "./TableHeader";
import { TableSidebar } from "./TableSidebar";
import type { ReactNode } from "react";
import { useT } from "../i18n/I18n";
import { gradeLine } from "../i18n/coach";

export interface LiveTableViewProps {
  state: TableState;
  overlay?: ReactNode;
  /** Champion screen: covers the table and replaces the hand result. */
  cover?: ReactNode;
  coach: CoachAdvice | null;
  comparison: Record<string, string> | null;
  countdown: number | null;
  paused: boolean;
  acting: boolean;
  showLabels: boolean;
  showResultLabels: boolean;
  nameBySeat: Map<number, string>;
  coachCollapsed: boolean;
  reviewOpen: boolean;
  username: string | null;
  onHome: () => void;
  onMistakes: () => void;
  onLogout: () => void;
  onTogglePause: () => void;
  onReview: () => void;
  onNext: () => void;
  onBackReview: () => void;
  onAction: (kind: ActionKind, amount?: number) => void;
  onToggleCoach: () => void;
}

/** The live table scene: header, felt (or review), and side panels. */
export function LiveTableView(props: LiveTableViewProps) {
  const t = useT();
  const free = useIsFree();
  const upright = useUprightPhone();
  const {
    state, overlay, cover, coach, comparison, countdown, paused, acting, showLabels,
    showResultLabels, nameBySeat, coachCollapsed, reviewOpen,
    username, onHome, onMistakes, onLogout, onTogglePause, onReview, onNext, onBackReview,
    onAction, onToggleCoach,
  } = props;
  const phone = usePhoneTable(upright ? comparison : null);
  const toggleHistory = () => phone.setDrawerOpen(!phone.drawerOpen);
  const hero = state.players.find((p) => p.isHero);
  const handOver = state.phase === "handOver" && !!state.review;
  const isReview = handOver && reviewOpen;
  // the hero's turn, with advice for this street: older advice never shows
  const coachNow = coach && state.waitingForHero && !acting && !handOver
    && (!coach.street || coach.street === state.street) ? coach : null;

  return (
    <div className="table-page" data-testid="table-page">
      <TableHeader
        state={state}
        username={username}
        paused={paused}
        handOver={handOver}
        isReview={isReview}
        onHome={onHome}
        onMistakes={onMistakes}
        onLogout={onLogout}
        onTogglePause={onTogglePause}
      />
      {isReview && state.review ? (
        <HandReview
          review={state.review}
          coach={coach}
          comparison={comparison}
          totalPlayers={state.players.length}
          nameBySeat={nameBySeat}
          onBack={onBackReview}
        />
      ) : (
        <>
          <PokerTable state={state} overlay={overlay} cover={cover}
            top={upright ? (free ? <LockedCoachChip place="top" /> : phone.stripOpen && (
              <CoachStrip coach={coachNow} heroCards={hero?.holeCards} grade={phone.grade} sheetOpen={phone.sheetOpen}
                onSheet={phone.setSheetOpen} onFold={() => phone.setStripOpen(false)} />
            )) : free ? <LockedCoachChip place="top" /> : coachNow ? <MobileCoachCard coach={coachNow} heroCards={hero?.holeCards} /> : null}
            trail={(
              <TableChips detailsOpen={phone.details} historyOpen={phone.drawerOpen}
                onDetails={() => phone.setDetails(!phone.details)} onHistory={toggleHistory}
                coachChip={upright && !free && !phone.stripOpen ? { grade: phone.grade, onClick: () => phone.setStripOpen(true) } : null} />
            )}
            detailsHidden={!phone.details}>
            {upright && free && <BotKey />}
            {cover ? null : handOver && state.review ? (
              <HandResult
                review={state.review}
                onReview={onReview}
                onNext={onNext}
                countdown={countdown}
                paused={paused}
                showResultLabels={showResultLabels}
              />
            ) : (
              <HeroControls
                legalActions={state.legalActions ?? []}
                toCall={state.toCall}
                pot={state.pot}
                stack={hero?.stack ?? 0}
                bigBlind={state.bigBlind}
                disabled={!state.waitingForHero}
                submitting={acting}
                showLabels={showLabels}
                street={state.street}
                heroBet={hero?.bet ?? 0}
                actionLog={state.actionLog}
                onAction={(kind: ActionKind, amount?: number) => onAction(kind, amount)}
              />
            )}
            {comparison && !handOver && !upright && (
              <div className="comparison-box" data-testid="comparison">
                <b>{gradeLine(comparison, t).grade}</b> — {gradeLine(comparison, t).text}
              </div>
            )}
          </PokerTable>
          <HistoryDrawer open={phone.drawerOpen} onClose={() => phone.setDrawerOpen(false)} actions={state.actionLog ?? []}
            heroSeat={state.heroSeat} nameBySeat={nameBySeat} tableId={state.tableId} handNumber={state.handNumber}
            locked={free} side={!upright} />
          {!upright && !handOver && (
            <TableSidebar coach={coach} heroCards={hero?.holeCards} coachCollapsed={coachCollapsed} onToggleCoach={onToggleCoach} />
          )}
        </>
      )}
    </div>
  );
}
