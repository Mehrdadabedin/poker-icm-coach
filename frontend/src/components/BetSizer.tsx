import { formatChips } from "../models/game";
import type { Preset } from "../models/betSizing";

interface BetSizerProps {
  presets: Preset[];
  selected: string | null;
  amount: number;
  min: number;
  max: number;
  step: number;
  note: string;
  disabled: boolean;
  onPreset: (p: Preset) => void;
  onAmount: (n: number) => void;
}

/** The size row under the action buttons: one tap on a preset, or - and +,
 * or the slider; typing in the box is optional. */
export function BetSizer({ presets, selected, amount, min, max, step, note, disabled, onPreset, onAmount }: BetSizerProps) {
  const set = (n: number) => onAmount(Math.min(max, Math.max(min, Math.round(n))));
  return (
    <div className="bet-sizer" data-testid="bet-sizer" data-bet-sizer>
      <div className="size-presets">
        {presets.map((p) => (
          <button key={p.key} type="button" disabled={disabled} data-testid={`size-${p.key}`}
            className={p.key === selected ? "size-preset active" : "size-preset"} aria-pressed={p.key === selected}
            onClick={() => onPreset(p)}>
            <b>{p.label}</b>
            <span>{formatChips(p.amount)}</span>
          </button>
        ))}
      </div>
      <div className="size-slider">
        <button type="button" className="size-step" disabled={disabled || amount <= min}
          aria-label="Smaller" data-testid="size-minus" onClick={() => set(amount - step)}>−</button>
        <input type="range" min={min} max={max} step={step} value={amount} disabled={disabled}
          aria-label="Bet size" data-testid="size-range" onChange={(e) => set(Number(e.target.value))} />
        <button type="button" className="size-step" disabled={disabled || amount >= max}
          aria-label="Bigger" data-testid="size-plus" onClick={() => set(amount + step)}>+</button>
        <label className="size-amount">
          <input type="number" min={min} max={max} value={amount} disabled={disabled} aria-label="Amount"
            data-testid="bet-amount" onChange={(e) => onAmount(Number(e.target.value) || min)}
            onBlur={() => set(amount)} />
          <small>{note}</small>
        </label>
      </div>
    </div>
  );
}
