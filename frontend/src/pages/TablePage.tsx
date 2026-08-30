import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PokerTable } from "../components/PokerTable";
import { HeroControls } from "../components/HeroControls";
import { useGame } from "../hooks/useGame";
import { ActionKind, LegalAction } from "../models/game";
import { coachAdvice, coachCompare } from "../services/api";

interface CoachPanel {
  recommendedAction: string;
  reasoning: string;
  detail: Record<string, string>;
}

/** Live table screen: backend state + hero controls + collapsible coach. */
export function TablePage() {
  const { tableId = "" } = useParams();
  const navigate = useNavigate();
  const { state, error, act, nextHand } = useGame(tableId);
  const [coach, setCoach] = useState<CoachPanel | null>(null);
  const [coachOpen, setCoachOpen] = useState(true);
  const [comparison, setComparison] = useState<Record<string, string> | null>(null);

  useEffect(() => {
    if (state?.waitingForHero) {
      coachAdvice(tableId)
        .then((data) => setCoach(data))
        .catch(() => undefined);
    } else {
      setCoach(null);
    }
  }, [state?.waitingForHero, state?.handNumber, tableId]);

  const onAction = async (kind: string, amount?: number) => {
    await act(kind, amount);
    if (state?.waitingForHero) {
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
  return (
    <div className="table-page" data-testid="table-page">
      <div className="top-bar">
        <button className="btn btn-small" onClick={() => navigate("/")}>HOME</button>
        <h1 className="screen-title">POKER ICM COACH</h1>
        {state.phase === "handOver" && (
          <button className="btn btn-small" onClick={nextHand} data-testid="next-hand">
            NEXT HAND
          </button>
        )}
      </div>
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
        <button className="btn btn-small coach-toggle" onClick={() => setCoachOpen((o) => !o)}>
          {coachOpen ? "HIDE COACH" : "SHOW COACH"}
        </button>
        {coachOpen && coach && (
          <div className="coach-panel" data-testid="coach-panel">
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
      </PokerTable>
    </div>
  );
}
