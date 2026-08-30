import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { request } from "../services/api";

type Advice = { recommendedAction: string; confidence: number; reasoning: string; detail: Record<string, string> };

const DEFAULT_BODY = {
  heroCards: [{ rank: "A", suit: "s" }, { rank: "K", suit: "h" }],
  position: "BTN", stack: 30000, bigBlind: 1000, smallBlind: 500, ante: 0,
  pot: 1800, toCall: 0, board: [], street: "preflop",
  playersRemaining: 9, paidPositions: 6, stacks: Array(9).fill(30000),
  payout: [0.4, 0.25, 0.15, 0.1, 0.06, 0.04], facingRaise: false, heroSeat: 0,
  mode: "advanced",
};

/** ICM COACH screen: standalone advice for any decision point. */
export function CoachPage() {
  const navigate = useNavigate();
  const [body, setBody] = useState(DEFAULT_BODY);
  const [advice, setAdvice] = useState<Advice | null>(null);
  const [running, setRunning] = useState(false);

  const run = async () => {
    setRunning(true);
    try {
      const data = await request<Advice>("/api/coach/advice", {
        method: "POST", body: JSON.stringify(body),
      });
      setAdvice(data);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="page" data-testid="coach-page">
      <h1 className="screen-title">ICM COACH</h1>
      <div className="toolbar">
        <label>
          POSITION
          <select value={body.position} onChange={(e) => setBody({ ...body, position: e.target.value })}>
            {["UTG", "UTG+1", "MP", "LJ", "HJ", "CO", "BTN", "SB", "BB"].map((p) => <option key={p}>{p}</option>)}
          </select>
        </label>
        <label>
          STACK BB
          <input type="number" value={body.stack} onChange={(e) => setBody({ ...body, stack: Number(e.target.value) })} />
        </label>
        <button className="btn" onClick={run} disabled={running}>ANALYZE</button>
        <button className="btn btn-small" onClick={() => navigate("/")}>HOME</button>
      </div>
      {advice && (
        <div className="coach-panel" data-testid="advice-panel">
          <h3>RECOMMENDATION: {advice.recommendedAction}</h3>
          <p className="confidence">Confidence {Math.round(advice.confidence * 100)}%</p>
          <p>{advice.reasoning}</p>
          <dl>
            {Object.entries(advice.detail).map(([k, v]) => (
              <div key={k} className="coach-row"><dt>{k}</dt><dd>{v}</dd></div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
}
