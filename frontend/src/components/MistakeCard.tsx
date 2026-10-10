/* One graded mistake: the hand, the decision point, and the coach's line. */

export type Decision = {
  street: string; heroAction: string; coachAction: string; grade: string;
  icmPressure: string; explanation: string; stackBb: number; toCall: number; board: string[];
};

export type Mistake = {
  handNumber: number; heroCards: string[]; heroPosition: string;
  level: number; blindLevel: string; decision: Decision;
};

const SUITS: Record<string, string> = { s: "♠", h: "♥", d: "♦", c: "♣" };

/** "Ah" -> "A♥"; red suits get a class so they read as red. */
function CardFace({ card }: { card: string }) {
  const suit = card.slice(-1);
  const red = suit === "h" || suit === "d";
  return <span className={`mistake-card${red ? " mistake-card-red" : ""}`}>{card.slice(0, -1)}{SUITS[suit] ?? suit}</span>;
}

export function MistakeCard({ mistake }: { mistake: Mistake }) {
  const d = mistake.decision;
  return (
    <article className="mistake" data-testid={`mistake-${mistake.handNumber}-${d.street}`}>
      <header className="mistake-head">
        <span>Hand #{mistake.handNumber}</span>
        <span>Level {mistake.level} ({mistake.blindLevel})</span>
        <span>{mistake.heroPosition}</span>
        <span className="mistake-street">{d.street}</span>
        <span className={`mistake-pressure mistake-pressure-${d.icmPressure.toLowerCase().replace(" ", "-")}`}>
          ICM {d.icmPressure}
        </span>
      </header>
      <div className="mistake-cards">
        {mistake.heroCards.map((c) => <CardFace key={c} card={c} />)}
        {d.board.length > 0 && <span className="mistake-board-label">Board</span>}
        {d.board.map((c) => <CardFace key={c} card={c} />)}
      </div>
      <p className="mistake-spot">
        Stack {d.stackBb} BB{d.toCall > 0 ? ` · ${d.toCall.toLocaleString()} to call` : ""}
      </p>
      <p className="mistake-line">
        You: <b className="mistake-you">{d.heroAction}</b>
        <span aria-hidden="true">{" → "}</span>
        Coach: <b className="mistake-coach">{d.coachAction}</b>
      </p>
      <p className="mistake-why">{d.explanation}</p>
    </article>
  );
}
