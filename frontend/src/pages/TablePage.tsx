import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { winnerPreviewEnabled } from "./endgame";
import { endgameOverlays } from "./endgameOverlays";
import { LiveTableView } from "../components/LiveTableView";
import { LoginForm } from "../components/LoginForm";
import { useAutoNext } from "../hooks/useAutoNext";
import { useAutoFinish } from "../hooks/useAutoFinish";
import { useGame } from "../hooks/useGame";
import { useTableActions } from "../hooks/useTableActions";
import type { ActionKind, CoachAdvice } from "../models/game";
import { tournamentChampion } from "../models/game";
import { useDisplayPreferences } from "../services/preferences";
import { clearAuth, coachAdvice, coachCompare, getToken, getUsername, request } from "../services/api";
import type { HandHistoryEntry } from "../webmcp/registerGameTools";
import { useGameWebMcp } from "../webmcp/useGameWebMcp";

const REVIEW_SECONDS = 10;

export { autoFinishActive, resolveWinnerName, winnerPreviewEnabled } from "./endgame";

export function TablePage() {
  const { tableId = "" } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [authed, setAuthed] = useState<boolean>(() => !!getToken());
  const [showReview, setShowReview] = useState(false);
  const [watchToEnd, setWatchToEnd] = useState(false); // A44: hero watched -> auto-finish
  const { state, error, nextHand, acting, refresh: refreshTable } = useGame(tableId);
  const { countdown, paused, start, stop, pause, resume } = useAutoNext(nextHand, REVIEW_SECONDS);
  const [coach, setCoach] = useState<CoachAdvice | null>(null);
  const [coachHidden, setCoachHidden] = useState(false);
  const [historyHidden, setHistoryHidden] = useState(false);
  const [comparison, setComparison] = useState<Record<string, string> | null>(null);
  const { actionLabels, resultLabels } = useDisplayPreferences();
  const lineup = useMemo(() => {
    const profiles = (state?.players ?? [])
      .filter((p) => !p.isHero)
      .map((p) => p.profile ?? null);
    return (profiles.length === 8 && profiles.every((p): p is string => p !== null))
      ? profiles : null;
  }, [state]);
  const actions = useTableActions({ tableId, refresh: refreshTable, navigate, lineup });
  const hero = state?.players.find((p) => p.isHero);
  const champion = state ? tournamentChampion(state) : null;
  const previewWinner = winnerPreviewEnabled(import.meta.env.DEV, searchParams.get("testWinner"));
  const championShown = previewWinner || champion !== null;
  const heroPendingReentry = !!hero?.awaitingReentry;
  const heroOut = !!hero && hero.sitsOut && !heroPendingReentry;
  const eliminationModalOpen = heroPendingReentry || (heroOut && !watchToEnd);

  useAutoFinish({
    enabled: watchToEnd,
    paused,
    heroOut,
    phase: state?.phase,
    handNumber: state?.handNumber,
    playersRemaining: state?.playersRemaining,
    championName: champion?.name ?? null,
    next: actions.nextHand,
    stop,
    start,
  });

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
  useEffect(() => {
    if (state?.phase === "handOver" && !showReview && !championShown && !eliminationModalOpen) {
      start();
    } else if (state?.phase !== "handOver") {
      stop();
      setShowReview(false);
    }
    return () => stop();
  }, [state?.phase, state?.handNumber, showReview, start, stop, championShown, eliminationModalOpen]);

  // A46: a coach-grade banner must not survive the hand it graded.
  useEffect(() => setComparison(null), [state?.handNumber]);

  const onAction = async (kind: ActionKind, amount?: number) => {
    const next = await actions.act(kind, amount);
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
    nextHand: actions.nextHand,
    startNewHand: actions.startNewGame,
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

  const { cover, overlay } = endgameOverlays({
    state,
    champion,
    previewWinner,
    previewName: searchParams.get("testWinnerName") ?? "",
    fallbackName: state.username ?? getUsername() ?? "",
    heroPendingReentry,
    eliminationModalOpen,
    onContinue: actions.continueReentry,
    onWatch: () => setWatchToEnd(true),
    onNewGame: () => void actions.startNewGame(),
  });

  return (
    <LiveTableView
      state={state}
      overlay={overlay}
      cover={cover}
      coach={coach}
      comparison={comparison}
      countdown={countdown}
      paused={paused}
      acting={acting}
      showLabels={actionLabels}
      showResultLabels={resultLabels}
      nameBySeat={new Map(state.players.map((p) => [p.seat, p.name]))}
      coachCollapsed={coachHidden}
      historyCollapsed={historyHidden}
      reviewOpen={showReview}
      username={getUsername()}
      onHome={() => navigate("/")}
      onLogout={async () => {
        await actions.signOut();
        setAuthed(false);
      }}
      onTogglePause={paused ? resume : pause}
      onReview={() => setShowReview(true)}
      onNext={() => void nextHand()}
      onBackReview={() => setShowReview(false)}
      onAction={(kind, amount) => void onAction(kind, amount)}
      onToggleCoach={() => setCoachHidden((v) => !v)}
      onToggleHistory={() => setHistoryHidden((v) => !v)}
    />
  );
}
