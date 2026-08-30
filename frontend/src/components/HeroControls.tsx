import { useState } from "react";
import { ActionKind, LegalAction, formatChips } from "../models/game";

interface HeroControlsProps {
  legalActions: LegalAction[];
  toCall: number;
  pot: number;
  stack: number;
  bigBlind: number;
  disabled: boolean;
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
  onAction,
}: HeroControlsProps) {
  const [sizing, setSizing] = useState<ActionKind | null>(null);
  const [amount, setAmount] = useState("");

  const has = (kind: ActionKind) => legalActions.some((a) => a.kind === kind);
  const meta = (kind: ActionKind) => legalActions.find((a) => a.kind === kind);
  const acting = disabled || legalActions.length === 0;

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
        <button className="btn btn-fold" disabled={acting} onClick={() => onAction("fold")}>
          FOLD
        </button>
        <button
          className="btn btn-call"
          disabled={acting || !has(callKind)}
          onClick={() => onAction(callKind, callKind === "call" ? toCall : undefined)}
        >
          {callLabel}
        </button>
        {has("bet") && (
          <button className="btn" disabled={acting} onClick={() => openSizing("bet")}>
            BET
          </button>
        )}
        {has("raise") && (
          <button className="btn" disabled={acting} onClick={() => openSizing("raise")}>
            RAISE
          </button>
        )}
        <button
          className="btn btn-allin"
          disabled={acting}
          onClick={() => onAction("all_in", stack)}
        >
          ALL-IN
        </button>
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
