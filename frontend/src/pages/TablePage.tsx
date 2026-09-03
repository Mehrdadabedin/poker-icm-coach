import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { HandResult } from "../components/HandResult";
import { HandReview } from "../components/HandReview";
import { HeroControls } from "../components/HeroControls";
import { LoginForm } from "../components/LoginForm";
import { PokerTable } from "../components/PokerTable";
import { TableHeader } from "../components/TableHeader";
import { TableSidebar } from "../components/TableSidebar";
import { useAutoNext } from "../hooks/useAutoNext";
import { useGame } from "../hooks/useGame";
import { ActionKind, LegalAction } from "../models/game";
import { clearAuth, coachAdvice, coachCompare, getToken, getUsername, logout } from "../services/api";

interface CoachPanel {
  recommendedAction: string;
  reasoning: string;
  detail: Record<string, string>;
}

const REVIEW_SECONDS = 30;

/** Live table: compact result + optional Review the Hand (A10/A11/A16). */
export function TablePage() {
  const { tableId = "" } = useParams();
  const navigate = useNavigate();
  const [authed, setAuthed] = useState<boolean>(() => !!getToken());
  const [showReview, setShowReview] = useState(false);
  const { state, error, act, nextHand, acting, refresh: refreshTable } = useGame(tableId);
  const { countdown, paused, start, stop, pause, resume } = useAutoNext(nextHand, REVIEW_SECONDS);
  const [coach, setCoach] = useState<CoachPanel | null>(null);
  const [comparison, setComparison] = useState<Record<string, string> | null>(null);

  useEffect(() => {
    if (state?.waitingForHero) {
      coachAdvice(tableId)
        .then((data) => setCoach(data))
        .catch(() => undefined);
    } else if (state?.phase !== "handOver") {
      setCoach(null);
    }
  }, [state?.waitingForHero, state?.handNumber, state?.phase, tableId]);

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
  };

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
          <PokerTable state={state}>
            {handOver && state.review ? (
              <HandResult
                review={state.review}
                username={state.username}
                onReview={() => setShowReview(true)}
                onNext={() => void nextHand()}
                countdown={countdown}
                paused={paused}
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
            />
          )}
        </>
      )}
    </div>
  );
}
