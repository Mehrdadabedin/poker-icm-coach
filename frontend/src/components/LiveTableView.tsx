import type { ActionKind, CoachAdvice, TableState } from "../models/game";
import { HandResult } from "./HandResult";
import { HandReview } from "./HandReview";
import { HeroControls } from "./HeroControls";
import { PokerTable } from "./PokerTable";
import { TableHeader } from "./TableHeader";
import { TableSidebar } from "./TableSidebar";
import type { ReactNode } from "react";

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
  historyCollapsed: boolean;
  reviewOpen: boolean;
  username: string | null;
  onHome: () => void;
  onLogout: () => void;
  onTogglePause: () => void;
  onReview: () => void;
  onNext: () => void;
  onBackReview: () => void;
  onAction: (kind: ActionKind, amount?: number) => void;
  onToggleCoach: () => void;
  onToggleHistory: () => void;
}

/** The live table scene: header, felt (or review), and side panels. */
export function LiveTableView(props: LiveTableViewProps) {
  const {
    state, overlay, cover, coach, comparison, countdown, paused, acting, showLabels,
    showResultLabels, nameBySeat, coachCollapsed, historyCollapsed, reviewOpen,
    username, onHome, onLogout, onTogglePause, onReview, onNext, onBackReview,
    onAction, onToggleCoach, onToggleHistory,
  } = props;
  const hero = state.players.find((p) => p.isHero);
  const handOver = state.phase === "handOver" && !!state.review;
  const isReview = handOver && reviewOpen;

  return (
    <div className="table-page" data-testid="table-page">
      <TableHeader
        state={state}
        username={username}
        paused={paused}
        handOver={handOver}
        isReview={isReview}
        onHome={onHome}
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
          <PokerTable state={state} overlay={overlay} cover={cover}>
            {cover ? null : handOver && state.review ? (
              <HandResult
                review={state.review}
                username={state.username}
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
                onAction={(kind: ActionKind, amount?: number) => onAction(kind, amount)}
              />
            )}
            {comparison && !handOver && (
              <div className="comparison-box" data-testid="comparison">
                <b>{comparison.grade}</b> — {comparison.explanation}
              </div>
            )}
          </PokerTable>
          {!handOver && (
            <TableSidebar
              actions={state.actionLog ?? []}
              heroSeat={state.heroSeat}
              nameBySeat={nameBySeat}
              coach={coach}
              tableId={state.tableId}
              handNumber={state.handNumber}
              currentLevel={state.level}
              coachCollapsed={coachCollapsed}
              historyCollapsed={historyCollapsed}
              onToggleCoach={onToggleCoach}
              onToggleHistory={onToggleHistory}
            />
          )}
        </>
      )}
    </div>
  );
}
