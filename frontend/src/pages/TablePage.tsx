import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { HandResult } from "../components/HandResult";
import { HandReview } from "../components/HandReview";
import { HeroControls } from "../components/HeroControls";
import { LoginForm } from "../components/LoginForm";
import { PokerTable } from "../components/PokerTable";
import { TableHeader } from "../components/TableHeader";
import { TableSidebar } from "../components/TableSidebar";
import { TournamentWinner } from "../components/TournamentWinner";
import { useAutoNext } from "../hooks/useAutoNext";
import { useGame } from "../hooks/useGame";
import { ActionKind, CoachAdvice, LegalAction, tournamentChampion } from "../models/game";
import { useLabelPreferences } from "../services/preferences";
import { clearAuth, coachAdvice, coachCompare, createTournament, getToken, getUsername, logout, nextHand as requestNextHand, request } from "../services/api";
import type { HandHistoryEntry } from "../webmcp/registerGameTools";
import { useGameWebMcp } from "../webmcp/useGameWebMcp";

const REVIEW_SECONDS = 10;

/** Development-only winner preview trigger. Always false for production
 * builds (import.meta.env.DEV is false there) and when the query parameter
 * is absent, so real tournament behavior is never affected. */
export function winnerPreviewEnabled(isDev: boolean, param: string | null): boolean {
  return isDev && param === "true";
}

/** Winner plaque name. Dev preview: the ?testWinnerName parameter (else the
 * signed-in username fallback). Real tournament: the champion's own name -
 * never the authenticated user. */
export function resolveWinnerName(
  previewWinner: boolean,
  previewName: string,
  championName: string | null,
  fallback: string,
): string {
  if (previewWinner) {
    return previewName || fallback;
  }
  return championName || fallback;
}

/** Live table: compact result + optional Review the Hand (A10/A11/A16). */
export function TablePage() {
  const { tableId = "" } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [authed, setAuthed] = useState<boolean>(() => !!getToken());
  const [showReview, setShowReview] = useState(false);
  const { state, error, act, nextHand, acting, refresh: refreshTable } = useGame(tableId);
  const { countdown, paused, start, stop, pause, resume } = useAutoNext(nextHand, REVIEW_SECONDS);
  const [coach, setCoach] = useState<CoachAdvice | null>(null);
  // UI-only HIDE / SHOW for the two side panels; no game or API state.
  const [coachHidden, setCoachHidden] = useState(false);
  const [historyHidden, setHistoryHidden] = useState(false);
  const [comparison, setComparison] = useState<Record<string, string> | null>(null);
  const { actionLabels, resultLabels } = useLabelPreferences();

  // The hero can be the actor more than once in a hand, on a later street or on
  // the same one after somebody reopens the betting. The 350 ms poll often never
  // catches the gap between those turns, so without a dependency that moves with
  // the action the panel kept showing the numbers from the earlier decision:
  // preflop pot odds with three cards out, or a board texture of n/a. street
  // covers the first case and the length of the action log covers the second.
  useEffect(() => {
    if (state?.waitingForHero) {
      coachAdvice(tableId)
        .then((data) => setCoach(data))
        .catch(() => undefined);
    } else if (state?.phase !== "handOver") {
      setCoach(null);
    }
  }, [state?.waitingForHero, state?.handNumber, state?.phase, state?.street,
      state?.actionLog?.length, tableId]);

  // Auto-next only on the table result state; review suspends it (A10/A16).
  useEffect(() => {
    if (state?.phase === "handOver" && !showReview) {
      start();
    } else if (state?.phase !== "handOver") {
      stop();
      setShowReview(false);
    }
    return () => stop();
  }, [state?.phase, state?.handNumber, showReview, start, stop]);

  const onAction = async (kind: string, amount?: number) => {
    const next = await act(kind, amount);
    if (next) {
      const grade = await coachCompare(tableId).catch(() => null);
      setComparison(grade);
    }
    return next;
  };

  useGameWebMcp({
    enabled: authed,
    stateAvailable: state !== null,
    tableId,
    getState: () => state,
    isPaused: () => paused,
    countdown: () => countdown,
    isReviewOpen: () => showReview,
    act: onAction,
    nextHand: async () => {
      const next = await requestNextHand(tableId);
      await refreshTable();
      return next;
    },
    startNewHand: async () => {
      const next = await createTournament(10);
      navigate(`/table/${next.tableId}`);
      return next;
    },
    getHandHistory: async () => {
      const data = await request<{ hands: HandHistoryEntry[] }>(
        `/api/game/${encodeURIComponent(tableId)}/hands`,
      );
      return data.hands;
    },
    pause,
    resume,
    showHandResult: () => setShowReview(true),
  });

  const signOut = async () => {
    try {
      await logout();
    } catch {
      // token may already be revoked server-side; clear locally regardless
    }
    clearAuth();
    navigate("/");
  };

  if (!authed) {
    return (
      <div className="page" data-testid="auth-gate">
        <h1 className="screen-title">ICM MASTER</h1>
        <LoginForm
          onLogin={() => {
            setAuthed(true);
            void refreshTable();
          }}
        />
      </div>
    );
  }
  if (error) {
    if (error.startsWith("Authentication required")) {
      clearAuth();
      setAuthed(false);
    }
    return <div className="error-box">API ERROR: {error}</div>;
  }
  if (!state) {
    return <div className="loading-box">Connecting to the table…</div>;
  }

  const hero = state.players.find((p) => p.isHero);
  const handOver = state.phase === "handOver" && !!state.review;
  const isReview = handOver && showReview;
  // Existing tournament state: the sole survivor is the champion (hero or
  // any BOT), so Alex/a BOT finishing first also triggers the presentation.
  const champion = tournamentChampion(state);
  // DEV preview only: reuses the exact winner branch; no effect in builds.
  const previewWinner = winnerPreviewEnabled(import.meta.env.DEV, searchParams.get("testWinner"));
  const previewName = searchParams.get("testWinnerName") ?? "";
  const winnerName = resolveWinnerName(
    previewWinner,
    previewName,
    champion?.name ?? null,
    state.username ?? getUsername() ?? "",
  );
  const showWinner = previewWinner || champion !== null;
  const nameBySeat = new Map(state.players.map((pl) => [pl.seat, pl.name]));

  return (
    <div className="table-page" data-testid="table-page">
      <TableHeader
        state={state}
        username={getUsername()}
        paused={paused}
        handOver={handOver}
        isReview={isReview}
        onHome={() => navigate("/")}
        onLogout={() => void signOut()}
        onTogglePause={paused ? resume : pause}
      />
      {isReview && state.review ? (
        <HandReview
          review={state.review}
          coach={coach}
          comparison={comparison}
          totalPlayers={state.players.length}
          nameBySeat={nameBySeat}
          onBack={() => setShowReview(false)}
        />
      ) : (
        <>
          <PokerTable
            state={state}
            overlay={showWinner ? (
              <TournamentWinner username={winnerName ?? ""} />
            ) : undefined}
          >
            {handOver && state.review ? (
              <HandResult
                review={state.review}
                username={state.username}
                onReview={() => setShowReview(true)}
                onNext={() => void nextHand()}
                countdown={countdown}
                paused={paused}
                showResultLabels={resultLabels}
              />
            ) : (
              <HeroControls
                legalActions={(state.legalActions ?? []) as LegalAction[]}
                toCall={state.toCall}
                pot={state.pot}
                stack={hero?.stack ?? 0}
                bigBlind={state.bigBlind}
                disabled={!state.waitingForHero}
                submitting={acting}
                showLabels={actionLabels}
                onAction={(kind: ActionKind, amount?: number) => void onAction(kind, amount)}
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
              tableId={tableId}
              handNumber={state.handNumber}
              currentLevel={state.level}
              coachCollapsed={coachHidden}
              historyCollapsed={historyHidden}
              onToggleCoach={() => setCoachHidden((v) => !v)}
              onToggleHistory={() => setHistoryHidden((v) => !v)}
            />
          )}
        </>
      )}
    </div>
  );
}
