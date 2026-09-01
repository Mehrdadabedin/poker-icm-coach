import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { request } from "../services/api";
import { Card } from "../models/game";
import { CardPicker, SUIT_SYMBOL, cardKey } from "../components/CoachCardPicker";

interface HandClass {
  name: string;
  cards: Card[];
}

type Advice = {
  recommendedAction: string;
  confidence: number;
  reasoning: string;
  detail: Record<string, string>;
  ev: { winProb: number; loseProb: number; pot: number; toCall: number; chipEv: number; evClass: string; chipRecommendation: string } | null;
  outs: { outs: number; unknown: number; improveTurn: number; improveRiver: number; winProb: number; method: string } | null;
  education: string;
};

const POSITIONS = ["UTG", "UTG+1", "MP", "LJ", "HJ", "CO", "BTN", "SB", "BB"];
const STREET_LABEL: Record<number, string> = { 0: "PRE-FLOP", 3: "FLOP", 4: "TURN", 5: "RIVER" };

/** ICM COACH: full 169-class + exact-card analysis with EV/outs/education. */
export function CoachPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"hand" | "exact">("hand");
  const [hands169, setHands169] = useState<HandClass[]>([]);
  const [handName, setHandName] = useState("AA");
  const [hero, setHero] = useState<Card[]>([{ rank: "A", suit: "s" }, { rank: "K", suit: "h" }]);
  const [board, setBoard] = useState<Card[]>([]);
  const [opponents, setOpponents] = useState(8);
  const [position, setPosition] = useState("BTN");
  const [stack, setStack] = useState(30000);
  const [pot, setPot] = useState(1800);
  const [toCall, setToCall] = useState(0);
  const [bigBlind, setBigBlind] = useState(1000);
  const [smallBlind, setSmallBlind] = useState(500);
  const [advice, setAdvice] = useState<Advice | null>(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    request<{ hands: HandClass[] }>("/api/coach/hands").then((d) => setHands169(d.hands)).catch(() => undefined);
  }, []);

  const selectHand = (name: string) => {
    setHandName(name);
    const found = hands169.find((h) => h.name === name);
    if (found) {
      setHero(found.cards);
      setBoard([]);
      setToCall(0);
      setAdvice(null);
    }
  };

  const setHeroCard = (i: 0 | 1) => (card: Card | null) => {
    setHero((prev) => {
      if (!card) return prev; // clearing keeps the current card (always a valid pair)
      const next = [...prev];
      next[i] = card;
      return next;
    });
  };

  const addBoardCard = (card: Card | null) => {
    if (!card) return;
    setBoard((prev) => (prev.length >= 5 || prev.some((c) => cardKey(c) === cardKey(card)) ? prev : [...prev, card]));
    setAdvice(null);
  };

  const street = board.length === 0 ? "preflop" : board.length === 3 ? "flop" : board.length === 4 ? "turn" : "river";

  const run = async () => {
    if (hero.some((c) => !c?.rank)) return;
    setRunning(true);
    try {
      const data = await request<Advice>("/api/coach/advice", {
        method: "POST",
        body: JSON.stringify({
          heroCards: hero,
          position, stack, bigBlind, smallBlind, ante: 0, pot, toCall,
          board, street,
          playersRemaining: opponents + 1, paidPositions: 6,
          stacks: Array(opponents + 1).fill(stack),
          payout: [0.4, 0.25, 0.15, 0.1, 0.06, 0.04],
          facingRaise: toCall > 0, heroSeat: 0, mode: "advanced",
          exactCards: mode === "exact",
        }),
      });
      setAdvice(data);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="page" data-testid="coach-page">
      <h1 className="screen-title">ICM COACH</h1>
      <div className="coach-mode-toggle">
        <button className={mode === "hand" ? "active" : ""} onClick={() => { setMode("hand"); setAdvice(null); }}>STARTING HAND</button>
        <button className={mode === "exact" ? "active" : ""} onClick={() => { setMode("exact"); setAdvice(null); }}>EXACT CARDS</button>
      </div>

      {mode === "hand" ? (
        <div className="toolbar">
          <label>
            STARTING HAND (169 CLASSES)
            <select value={handName} onChange={(e) => selectHand(e.target.value)} data-testid="hand-select">
              {hands169.map((h) => <option key={h.name} value={h.name}>{h.name}</option>)}
            </select>
          </label>
          <span className="note">Representative combo for {handName}: {hero.map((c) => `${c.rank}${SUIT_SYMBOL[c.suit]}`).join(" ")}</span>
        </div>
      ) : (
        <div className="toolbar exact-cards">
          {[0, 1].map((i) => (
            <CardPicker
              key={i}
              label={`CARD ${i + 1}`}
              value={hero[i]?.rank ? hero[i] : null}
              used={hero.filter((_, j) => j !== i) as Card[]}
              onChange={setHeroCard(i as 0 | 1)}
            />
          ))}
        </div>
      )}

      <div className="train-grid">
        <div className="toolbar">
          <label>POSITION<select value={position} onChange={(e) => setPosition(e.target.value)}>{POSITIONS.map((p) => <option key={p}>{p}</option>)}</select></label>
          <label>OPPONENTS<input type="number" min={1} max={8} value={opponents} onChange={(e) => setOpponents(Number(e.target.value))} /></label>
          <label>STACK<input type="number" min={0} value={stack} onChange={(e) => setStack(Number(e.target.value))} /></label>
          <label>POT<input type="number" min={0} value={pot} onChange={(e) => setPot(Number(e.target.value))} /></label>
          <label>TO CALL<input type="number" min={0} value={toCall} onChange={(e) => setToCall(Number(e.target.value))} /></label>
        </div>
        <div className="toolbar">
          <label>SMALL BLIND<input type="number" min={0} value={smallBlind} onChange={(e) => setSmallBlind(Number(e.target.value))} /></label>
          <label>BIG BLIND<input type="number" min={1} value={bigBlind} onChange={(e) => setBigBlind(Number(e.target.value))} /></label>
          <button className="btn" onClick={run} disabled={running} data-testid="analyze-btn">ANALYZE</button>
          <button className="btn btn-small" onClick={() => navigate("/")}>HOME</button>
        </div>
      </div>

      <div className="board-picker">
        <span className="board-street">BOARD — {STREET_LABEL[board.length] ?? "?"} ({board.length}/5)</span>
        <div className="board-cards">
          {board.map((c, i) => (
            <span key={i} className="board-chip">{c.rank}{SUIT_SYMBOL[c.suit]}
              <button className="chip-remove" onClick={() => { setBoard(board.filter((_, j) => j !== i)); setAdvice(null); }}>✕</button>
            </span>
          ))}
          {board.length < 5 && (
            <CardPicker label="ADD CARD" value={null} used={[...hero, ...board].filter(Boolean) as Card[]} onChange={addBoardCard} resetAfterPick />
          )}
        </div>
      </div>

      {advice && (
        <div className="coach-panel" data-testid="advice-panel">
          <h3>RECOMMENDATION: {advice.recommendedAction}</h3>
          <p className="confidence">Confidence {Math.round(advice.confidence * 100)}%</p>

          {advice.ev && (
            <div className={`ev-panel ${advice.ev.evClass === "POSITIVE EV" ? "ev-pos" : "ev-neg"}`} data-testid="ev-panel">
              <div className="ev-row"><b>CHIP EV:</b> <span>{advice.ev.chipEv >= 0 ? `+${advice.ev.chipEv.toLocaleString()}` : advice.ev.chipEv.toLocaleString()}</span></div>
              <div className="ev-row"><b>CLASS:</b> <span>{advice.ev.evClass}</span></div>
              <div className="ev-row"><b>WIN PROB:</b> <span>{(advice.ev.winProb * 100).toFixed(1)}%</span> <b>LOSE PROB:</b> <span>{(advice.ev.loseProb * 100).toFixed(1)}%</span></div>
              <div className="ev-row"><b>POT:</b> <span>{advice.ev.pot.toLocaleString()}</span> <b>TO CALL:</b> <span>{advice.ev.toCall.toLocaleString()}</span></div>
              <div className="ev-row"><b>CHIP RECOMMENDATION:</b> <span>{advice.ev.chipRecommendation}</span></div>
              <div className="ev-row ev-note">TOURNAMENT/ICM: {advice.recommendedAction} (ICM-aware decision may differ from raw chip EV)</div>
            </div>
          )}

          {advice.outs && (
            <div className="outs-grid" data-testid="outs-panel">
              <span>OUTS: <b>{advice.outs.outs}</b> / {advice.outs.unknown} unknown</span>
              <span>IMPROVE TURN: <b>{(advice.outs.improveTurn * 100).toFixed(1)}%</b></span>
              <span>IMPROVE BY RIVER: <b>{(advice.outs.improveRiver * 100).toFixed(1)}%</b></span>
              <span>WIN PROBABILITY: <b>{(advice.outs.winProb * 100).toFixed(1)}%</b> ({advice.outs.method})</span>
            </div>
          )}

          {advice.education && <p className="coach-education" data-testid="coach-education">{advice.education}</p>}
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
