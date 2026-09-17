import { useState } from "react";
import { ActionKind, LegalAction, formatChips } from "../models/game";

// Phase 7: single reusable label mechanism — glyphs with accessible text.
const GLYPH: Record<string, string> = {
  fold: "✕", check: "✓", call: "▲",
  bet: "●", raise: "⬈", all_in: "★",
};

interface HeroControlsProps {
  legalActions: LegalAction[];
  toCall: number;
  pot: number;
  stack: number;
  bigBlind: number;
  disabled: boolean;
  submitting?: boolean;
  /** Phase 7: when false, action buttons show a glyph instead of the text
   * label (always accessible via aria-label/title). */
  showLabels?: boolean;
  onAction: (kind: ActionKind, amount?: number) => void;
}

/** Large mobile-friendly action buttons; only legal actions are rendered. */
export function HeroControls({
  legalActions,
  toCall,
  pot,
  stack,
  bigBlind,
  disabled,
  submitting = false,
  showLabels = true,
  onAction,
}: HeroControlsProps) {
  const [sizing, setSizing] = useState<ActionKind | null>(null);
  const [amount, setAmount] = useState("");

  const has = (kind: ActionKind) => legalActions.some((a) => a.kind === kind);
  const meta = (kind: ActionKind) => legalActions.find((a) => a.kind === kind);
  // Blocks double-submits (a second click arrives after the polled state
  // still shows "waiting for hero" and would produce an HTTP 400).
  const acting = disabled || legalActions.length === 0 || submitting;

  const callKind: ActionKind = toCall > 0 ? "call" : "check";
  const callLabel =
    callKind === "call" ? `CALL ${formatChips(toCall)}` : "CHECK";

  const openSizing = (kind: ActionKind) => {
    const m = meta(kind);
    setAmount(String(m?.minAmount ?? bigBlind));
    setSizing(kind);
  };

  const submitSizing = () => {
    const value = Number(amount);
    if (sizing && value > 0 && !acting) {
      onAction(sizing, value);
    }
    setSizing(null);
    setAmount("");
  };

  // The engine sizes an all-in as a street total, so it already counts what the
  // hero has in front of them. Falling back to the bare stack understates it.
  const allInTo = meta("all_in")?.amount ?? stack;

  const sizeAction = meta(sizing ?? "bet");
  const minSize = sizeAction?.minAmount ?? bigBlind;
  const maxSize = sizeAction?.maxAmount ?? stack;

  return (
    <div className="hero-controls" data-testid="hero-controls">
      <div className="hero-info">
        <span>TO CALL {formatChips(toCall)}</span>
        <span>POT {formatChips(pot)}</span>
        <span>STACK {formatChips(stack)}</span>
        {has("raise") && (
          <span className="raise-hint">MIN RAISE {formatChips(meta("raise")?.minAmount ?? 0)}</span>
        )}
      </div>
      <div className="controls-row">
        <button
          className="btn btn-fold"
          disabled={acting}
          aria-label="Fold"
          title="Fold"
          onClick={() => onAction("fold")}
        >
          {showLabels ? "FOLD" : GLYPH.fold}
        </button>
        <button
          className="btn btn-call"
          disabled={acting || !has(callKind)}
          aria-label={callKind === "call" ? `Call ${formatChips(toCall)}` : "Check"}
          title={callKind === "call" ? `Call ${formatChips(toCall)}` : "Check"}
          onClick={() => onAction(callKind, callKind === "call" ? toCall : undefined)}
        >
          {showLabels ? callLabel : GLYPH[callKind]}
        </button>
        {has("bet") && (
          <button
            className="btn"
            disabled={acting}
            aria-label="Bet"
            title="Bet"
            onClick={() => openSizing("bet")}
          >
            {showLabels ? "BET" : GLYPH.bet}
          </button>
        )}
        {has("raise") && (
          <button
            className="btn"
            disabled={acting}
            aria-label="Raise"
            title="Raise"
            onClick={() => openSizing("raise")}
          >
            {showLabels ? "RAISE" : GLYPH.raise}
          </button>
        )}
        {has("all_in") && (
          <button
            className="btn btn-allin"
            disabled={acting}
            aria-label={`All-in ${formatChips(allInTo)}`}
            title={`All-in ${formatChips(allInTo)}`}
            onClick={() => onAction("all_in", allInTo)}
          >
            {showLabels ? `ALL-IN ${formatChips(allInTo)}` : GLYPH.all_in}
          </button>
        )}
      </div>
      {sizing && (
        <div className="bet-sizing" data-testid="bet-sizing">
          <input
            type="number"
            value={amount}
            min={minSize}
            max={maxSize}
            onChange={(e) => setAmount(e.target.value)}
            data-testid="bet-amount"
          />
          <button className="btn btn-small" onClick={() => setAmount(String(minSize))}>
            MIN
          </button>
          <button className="btn btn-small" onClick={() => setAmount(String(pot))}>
            POT
          </button>
          <button className="btn btn-small" onClick={() => setAmount(String(maxSize))}>
            ALL-IN
          </button>
          <button className="btn btn-small btn-confirm" onClick={submitSizing}>
            CONFIRM
          </button>
        </div>
      )}
    </div>
  );
}
