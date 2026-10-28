import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { winnerPreviewEnabled } from "./endgame";
import { endgameOverlays } from "./endgameOverlays";
import { LiveTableView } from "../components/LiveTableView";
import { LoginForm } from "../components/LoginForm";
import { TableGone } from "../components/TableGone";
import { useAutoNext } from "../hooks/useAutoNext";
import { useAutoFinish } from "../hooks/useAutoFinish";
import { useGame } from "../hooks/useGame";
import { useTableCoach } from "../hooks/useTableCoach";
import { usePlan } from "../services/plan";
import { useTableActions } from "../hooks/useTableActions";
import { useTableAway } from "../hooks/useTableAway";
import { tournamentChampion } from "../models/game";
import { useDisplayPreferences } from "../services/preferences";
import { clearAuth, getToken, getUsername, request } from "../services/api";
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
  const [coachHidden, setCoachHidden] = useState(false);
  const [historyHidden, setHistoryHidden] = useState(false);
  const { actionLabels, resultLabels } = useDisplayPreferences();
  const lineup = useMemo(() => {
    const profiles = (state?.players ?? [])
      .filter((p) => !p.isHero)
      .map((p) => p.profile ?? null);
    return (profiles.length === 8 && profiles.every((p): p is string => p !== null))
      ? profiles : null;
  }, [state]);
  const actions = useTableActions({ tableId, refresh: refreshTable, navigate, lineup });
  useTableAway(tableId, state?.tableLabel ?? "", state?.away);
  const plan = usePlan();
  const { coach, comparison, onAction } = useTableCoach(tableId, state, actions.act, plan);
  const hero = state?.players.find((p) => p.isHero);
  const champion = state ? tournamentChampion(state) : null;
  const previewWinner = winnerPreviewEnabled(import.meta.env.DEV, searchParams.get("testWinner"));
  const championShown = previewWinner || champion !== null || !!state?.standings;
  const heroPendingReentry = !!hero?.awaitingReentry;
  const heroOut = !!hero && hero.sitsOut && !heroPendingReentry;
  const eliminationModalOpen = (heroPendingReentry || heroOut) && !watchToEnd;

  useAutoFinish({
    enabled: watchToEnd,
    paused,
    heroOut: heroOut || heroPendingReentry, // plan 092: WATCH is offered while re-entry is open too
    phase: state?.phase,
    handNumber: state?.handNumber,
    playersRemaining: state?.playersRemaining,
    championName: champion?.name ?? null,
    next: actions.nextHand,
    stop,
    start,
  });

  useEffect(() => {
    if (state?.phase === "handOver" && !showReview && !championShown && !eliminationModalOpen) {
      start();
    } else if (state?.phase !== "handOver") {
      stop();
      setShowReview(false);
    }
    return () => stop();
  }, [state?.phase, state?.handNumber, showReview, start, stop, championShown, eliminationModalOpen]);

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
    if (error.startsWith("API 404")) return <TableGone />;
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
    onEnd: () => void actions.endGame(),
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
      onMistakes={() => navigate("/mistakes")}
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
