import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ActionHistory } from "../components/ActionHistory";
import { HandReview } from "../components/HandReview";
import { HeroControls } from "../components/HeroControls";
import { PokerTable } from "../components/PokerTable";
import { useGame } from "../hooks/useGame";
import { ActionKind, LegalAction } from "../models/game";
import { coachAdvice, coachCompare } from "../services/api";

interface CoachPanel {
  recommendedAction: string;
  reasoning: string;
  detail: Record<string, string>;
}

const REVIEW_SECONDS = 7;

/** Live table screen: backend state + hero controls + hand review flow. */
export function TablePage() {
  const { tableId = "" } = useParams();
  const navigate = useNavigate();
  const { state, error, act, nextHand } = useGame(tableId);
  const [coach, setCoach] = useState<CoachPanel | null>(null);
  const [comparison, setComparison] = useState<Record<string, string> | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const nextHandRef = useRef(nextHand);
  nextHandRef.current = nextHand;

  const clearCountdown = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setCountdown(null);
    setPaused(false);
  }, []);

  const startCountdown = useCallback(
    (from = REVIEW_SECONDS) => {
      if (timerRef.current) clearInterval(timerRef.current); // never two timers
      let remaining = from;
      setCountdown(remaining);
      setPaused(false);
      timerRef.current = setInterval(() => {
        remaining -= 1;
        if (remaining <= 0) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          setCountdown(null);
          void nextHandRef.current();
        } else {
          setCountdown(remaining);
        }
      }, 1000);
    },
    [],
  );

  const pauseNext = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setPaused(true);
  }, []);

  const continueNext = useCallback(() => {
    startCountdown(countdown ?? REVIEW_SECONDS);
  }, [countdown, startCountdown]);

  // coach advice at hero decision points; keep it visible during hand review
  useEffect(() => {
    if (state?.waitingForHero) {
      coachAdvice(tableId)
        .then((data) => setCoach(data))
        .catch(() => undefined);
    } else if (state?.phase !== "handOver") {
      setCoach(null);
    }
  }, [state?.waitingForHero, state?.handNumber, state?.phase, tableId]);

  // automatic next hand: start the review countdown when a hand completes
  useEffect(() => {
    if (state?.phase === "handOver") {
      startCountdown(REVIEW_SECONDS);
    } else if (state?.phase === "playing") {
      clearCountdown();
    }
    return () => clearCountdown();
  }, [state?.phase, state?.handNumber, startCountdown, clearCountdown]);

  const onAction = async (kind: string, amount?: number) => {
    const next = await act(kind, amount);
    if (next) {
      const grade = await coachCompare(tableId).catch(() => null);
      setComparison(grade);
    }
  };

  if (error) {
    return <div className="error-box">API ERROR: {error}</div>;
  }
  if (!state) {
    return <div className="loading-box">Connecting to the table…</div>;
  }

  const hero = state.players.find((p) => p.isHero);
  const isReview = state.phase === "handOver" && !!state.review;

  return (
    <div className="table-page" data-testid="table-page">
      <div className="top-bar app-header" data-testid="app-header">
        <div className="header-left">
          <button className="btn btn-small header-btn" onClick={() => navigate("/")} data-testid="home-btn">
            HOME
          </button>
          <button
            className={`btn btn-small header-icon-btn ${paused ? "header-icon-play" : ""}`}
            onClick={paused ? continueNext : pauseNext}
            disabled={!isReview}
            title={paused ? "Resume automatic next hand" : "Pause automatic next hand"}
            aria-label={paused ? "Resume automatic next hand" : "Pause automatic next hand"}
            data-testid="pause-play"
          >
            {paused ? "▶" : "⏸"}
          </button>
        </div>
        <h1 className="screen-title header-title" data-testid="app-title">ICM MASTER</h1>
      </div>
      {isReview && state.review ? (
        <HandReview
          review={state.review}
          coach={coach}
          comparison={comparison}
          countdown={countdown}
          paused={paused}
          totalPlayers={state.players.length}
          nameBySeat={new Map(state.players.map((pl) => [pl.seat, pl.name]))}
        />
      ) : (
        <>
          <PokerTable state={state}>
            <HeroControls
              legalActions={(state.legalActions ?? []) as LegalAction[]}
              toCall={state.toCall}
              pot={state.pot}
              stack={hero?.stack ?? 0}
              bigBlind={state.bigBlind}
              disabled={!state.waitingForHero}
              onAction={(kind: ActionKind, amount?: number) => void onAction(kind, amount)}
            />
            {comparison && (
              <div className="comparison-box" data-testid="comparison">
                <b>{comparison.grade}</b> — {comparison.explanation}
              </div>
            )}
          </PokerTable>
          <div className="table-cols">
            <ActionHistory
              actions={state.actionLog ?? []}
              heroSeat={state.heroSeat}
              nameBySeat={new Map(state.players.map((pl) => [pl.seat, pl.name]))}
            />
            {coach && (
              <div className="coach-panel table-side" data-testid="coach-panel">
                <h3>ICM COACH</h3>
                <div className="coach-recommendation">{coach.recommendedAction}</div>
                <p>{coach.reasoning}</p>
                <dl>
                  {Object.entries(coach.detail).slice(0, 14).map(([k, v]) => (
                    <div key={k} className="coach-row">
                      <dt>{k}</dt>
                      <dd>{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
