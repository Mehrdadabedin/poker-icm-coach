import { formatChips } from "../models/game";
import type { Preset } from "../models/betSizing";
import { useT } from "../i18n/I18n";
import { numberLocale } from "../i18n/lang";

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
  const t = useT();
  // 2.5x reads 2,5x in Spanish; All-in and Pot are words
  const presetLabel = (key: string, label: string) => key === "allin" ? t("size.allin")
    : key === "Pot" ? t("size.potPreset")
      : label.endsWith("x") ? `${Number(label.slice(0, -1)).toLocaleString(numberLocale())}x` : label;
  const set = (n: number) => onAmount(Math.min(max, Math.max(min, Math.round(n))));
  return (
    <div className="bet-sizer" data-testid="bet-sizer" data-bet-sizer>
      <div className="size-presets">
        {presets.map((p) => (
          <button key={p.key} type="button" disabled={disabled} data-testid={`size-${p.key}`}
            className={p.key === selected ? "size-preset active" : "size-preset"} aria-pressed={p.key === selected}
            onClick={() => onPreset(p)}>
            <b>{presetLabel(p.key, p.label)}</b>
            <span>{formatChips(p.amount)}</span>
          </button>
        ))}
      </div>
      <div className="size-slider">
        <button type="button" className="size-step" disabled={disabled || amount <= min}
          aria-label={t("size.smaller")} data-testid="size-minus" onClick={() => set(amount - step)}>−</button>
        <input type="range" min={min} max={max} step={step} value={amount} disabled={disabled}
          aria-label={t("size.range")} data-testid="size-range" onChange={(e) => set(Number(e.target.value))} />
        <button type="button" className="size-step" disabled={disabled || amount >= max}
          aria-label={t("size.bigger")} data-testid="size-plus" onClick={() => set(amount + step)}>+</button>
        <label className="size-amount">
          <input type="number" min={min} max={max} value={amount} disabled={disabled} aria-label={t("size.amount")}
            data-testid="bet-amount" onChange={(e) => onAmount(Number(e.target.value) || min)}
            onBlur={() => set(amount)} />
          <small>{note}</small>
        </label>
      </div>
    </div>
  );
}
