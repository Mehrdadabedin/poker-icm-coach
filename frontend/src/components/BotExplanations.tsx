import { useState } from "react";
import { BotExplanation, formatChips } from "../models/game";

const ACT_LABEL: Record<string, string> = {
  fold: "Fold",
  check: "Check",
  call: "Call",
  bet: "Bet",
  raise: "Raise",
  all_in: "All-in",
};

interface BotExplanationsProps {
  explanations: BotExplanation[];
}

/** Expandable "why did this bot act" list, one real decision per row. */
export function BotExplanations({ explanations }: BotExplanationsProps) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const toggle = (i: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  if (explanations.length === 0) return null;

  return (
    <div className="bot-explanations" data-testid="bot-explanations">
      <h3>WHY THE BOTS ACTED <span className="hint">(tap to expand)</span></h3>
      {explanations.map((e, i) => (
        <div key={i} className={`expl-item ${expanded.has(i) ? "expl-open" : ""}`}>
          <button className="expl-head" onClick={() => toggle(i)} aria-expanded={expanded.has(i)}>
            <span className="expl-arrow">{expanded.has(i) ? "▾" : "▸"}</span>
            <span className="expl-who">
              <b>{e.name}</b> — {ACT_LABEL[e.action] ?? e.action}
              {e.amount != null ? ` ${formatChips(e.amount)}` : ""}
              <span className="expl-street">{e.street.toUpperCase()}</span>
            </span>
          </button>
          {expanded.has(i) && (
            <div className="expl-body">
              <dl className="expl-factors">
                <div><dt>Position</dt><dd>{e.position}</dd></div>
                <div><dt>Hand</dt><dd className="expl-hand">{e.hand}</dd></div>
                <div><dt>Stack</dt><dd>{e.stackBB} BB</dd></div>
                <div><dt>Pot odds</dt><dd>{e.potOdds}</dd></div>
                <div><dt>Est. equity</dt><dd>{e.equity}</dd></div>
                <div><dt>ICM pressure</dt><dd>{e.icmPressure}</dd></div>
                <div><dt>Action faced</dt><dd>{e.faced}</dd></div>
              </dl>
              <p className="expl-decision">{e.reason}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
