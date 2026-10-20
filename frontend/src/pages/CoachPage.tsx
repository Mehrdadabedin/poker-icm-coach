import { useEffect, useState } from "react";
import { request } from "../services/api";
import { Copyright } from "../components/Copyright";
import { PageHeader } from "../components/PageHeader";
import { Card, POSITIONS_9MAX } from "../models/game";
import { CardPicker, SUIT_SYMBOL, cardKey } from "../components/CoachCardPicker";
import { CoachAdvicePanel, type Advice } from "../components/CoachAdvicePanel";
import { useT } from "../i18n/I18n";
import type { MessageKey } from "../i18n/messages/en";

interface HandClass {
  name: string;
  cards: Card[];
}


/** ICM COACH: full 169-class + exact-card analysis with EV/outs/education. */
export function CoachPage() {
  const t = useT();
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

  const STREETS: Record<number, string> = { 0: "preflop", 3: "flop", 4: "turn", 5: "river" };
  const street = STREETS[board.length] ?? "NOT_READY";
  const boardReady = street !== "NOT_READY";

  const run = async () => {
    if (hero.some((c) => !c?.rank) || !boardReady) return;
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
      <PageHeader />
      <h1 className="screen-title">{t("coachPage.title")}</h1>
      <div className="coach-mode-toggle">
        <button className={mode === "hand" ? "active" : ""} onClick={() => { setMode("hand"); setAdvice(null); }}>{t("coachPage.mode.hand")}</button>
        <button className={mode === "exact" ? "active" : ""} onClick={() => { setMode("exact"); setAdvice(null); }}>{t("coachPage.mode.exact")}</button>
      </div>

      {mode === "hand" ? (
        <div className="toolbar">
          <label>
            {t("coachPage.handClass")}
            <select value={handName} onChange={(e) => selectHand(e.target.value)} data-testid="hand-select">
              {hands169.map((h) => <option key={h.name} value={h.name}>{h.name}</option>)}
            </select>
          </label>
          <span className="note">{t("coachPage.combo", { hand: handName, cards: hero.map((c) => `${c.rank}${SUIT_SYMBOL[c.suit]}`).join(" ") })}</span>
        </div>
      ) : (
        <div className="toolbar exact-cards">
          {[0, 1].map((i) => (
            <CardPicker
              key={i}
              label={t("coachPage.card", { n: i + 1 })}
              id={`card-${i + 1}`}
              value={hero[i]?.rank ? hero[i] : null}
              used={hero.filter((_, j) => j !== i)}
              onChange={setHeroCard(i as 0 | 1)}
            />
          ))}
        </div>
      )}

      <div className="train-grid">
        <div className="toolbar">
          <label>{t("coachPage.position")}<select value={position} onChange={(e) => setPosition(e.target.value)}>{POSITIONS_9MAX.map((p) => <option key={p}>{p}</option>)}</select></label>
          <label>{t("coachPage.opponents")}<input type="number" min={1} max={8} value={opponents} onChange={(e) => setOpponents(Number(e.target.value))} /></label>
          <label>{t("coachPage.stack")}<input type="number" min={0} value={stack} onChange={(e) => setStack(Number(e.target.value))} /></label>
          <label>{t("coachPage.pot")}<input type="number" min={0} value={pot} onChange={(e) => setPot(Number(e.target.value))} /></label>
          <label>{t("coachPage.toCall")}<input type="number" min={0} value={toCall} onChange={(e) => setToCall(Number(e.target.value))} /></label>
        </div>
        <div className="toolbar">
          <label>{t("coachPage.smallBlind")}<input type="number" min={0} value={smallBlind} onChange={(e) => setSmallBlind(Number(e.target.value))} /></label>
          <label>{t("coachPage.bigBlind")}<input type="number" min={1} value={bigBlind} onChange={(e) => setBigBlind(Number(e.target.value))} /></label>
          <button className="btn" onClick={run} disabled={running || !boardReady} data-testid="analyze-btn">{t("coachPage.analyze")}</button>
        </div>
      </div>

      <div className="board-picker">
        <span className="board-street">{t("coachPage.board", { street: t(`coachPage.street.${street}` as MessageKey) })}</span>
        {!boardReady && <span className="note">{t("coachPage.boardHint")}</span>}
        <div className="board-cards">
          {board.map((c, i) => (
            <span key={i} className="board-chip">{c.rank}{SUIT_SYMBOL[c.suit]}
              <button className="chip-remove" onClick={() => { setBoard(board.filter((_, j) => j !== i)); setAdvice(null); }}>✕</button>
            </span>
          ))}
          {board.length < 5 && (
            <CardPicker label={t("coachPage.addCard")} id="add-card" value={null} used={[...hero, ...board]} onChange={addBoardCard} resetAfterPick />
          )}
        </div>
      </div>

      {advice && <CoachAdvicePanel advice={advice} />}
      <Copyright />
    </div>
  );
}
