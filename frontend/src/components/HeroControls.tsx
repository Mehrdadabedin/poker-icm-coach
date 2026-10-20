import { useState } from "react";
import { ActionKind, LegalAction, TableAction, formatChips } from "../models/game";
import {
  defaultKey, preflopRaises, presets as sizePresets, sizeNote, stepSize, type Preset, type SizingInput,
} from "../models/betSizing";
import { useHeroKeys } from "../hooks/useHeroKeys";
import { BetSizer } from "./BetSizer";
import { useT } from "../i18n/I18n";
import { numberLocale } from "../i18n/lang";

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
  street?: string;
  heroBet?: number;  // the hero's chips already in on this street
  actionLog?: TableAction[];
  onAction: (kind: ActionKind, amount?: number) => void;
}

type Choice = { decision: string; selected: string | null; amount: number };

/** Large mobile-friendly action buttons; only legal actions are rendered.
 * Sizes show as soon as it is the hero's turn: a preset or - and + set the
 * amount, and the yellow button (or Enter) plays it. */
export function HeroControls({
  legalActions, toCall, pot, stack, bigBlind, disabled, submitting = false, showLabels = true,
  street = "flop", heroBet = 0, actionLog, onAction,
}: HeroControlsProps) {
  const t = useT();
  const has = (kind: ActionKind) => legalActions.some((a) => a.kind === kind);
  const meta = (kind: ActionKind) => legalActions.find((a) => a.kind === kind);
  // Blocks double-submits (a second click arrives after the polled state
  // still shows "waiting for hero" and would produce an HTTP 400).
  const acting = disabled || legalActions.length === 0 || submitting;

  const callKind: ActionKind = toCall > 0 ? "call" : "check";
  const callLabel = callKind === "call" ? t("controls.call", { n: formatChips(toCall) }) : t("controls.check");
  // The engine sizes an all-in as a street total, so it already counts what the
  // hero has in front of them. Falling back to the bare stack understates it.
  const allInTo = meta("all_in")?.amount ?? stack;

  const sizeKind: ActionKind | null = has("bet") ? "bet" : has("raise") ? "raise" : null;
  const sizeMeta = sizeKind ? meta(sizeKind) : undefined;
  const input: SizingInput | null = sizeKind ? {
    street, toCall, pot, bigBlind, heroBet,
    raises: street === "preflop" ? preflopRaises(actionLog, bigBlind) : 0,
    min: sizeMeta?.minAmount ?? bigBlind, max: sizeMeta?.maxAmount ?? allInTo,
  } : null;
  const list: Preset[] = input ? sizePresets(input) : [];
  const decision = `${street}|${toCall}|${pot}|${heroBet}|${input?.min}|${input?.max}`;
  const start = input ? list.find((p) => p.key === defaultKey(input)) ?? list[0] : undefined;
  const [choice, setChoice] = useState<Choice | null>(null);
  // a new decision starts from the default size again
  const current: Choice = choice?.decision === decision ? choice
    : { decision, selected: start?.key ?? null, amount: start?.amount ?? input?.min ?? 0 };
  const amount = current.amount;
  const allIn = input !== null && amount >= input.max;

  const setAmount = (n: number, selected: string | null = null) => setChoice({ decision, selected, amount: n });
  const step = (dir: number) => input && setAmount(Math.min(input.max, Math.max(input.min, amount + dir * stepSize(input))));
  const playSize = () => {
    if (!input || !sizeKind || acting) return;
    const n = Math.min(input.max, Math.max(input.min, Math.round(amount)));
    if (n >= input.max && has("all_in")) onAction("all_in", allInTo);
    else onAction(sizeKind, n);
  };
  const fold = () => { if (!acting && toCall > 0) onAction("fold"); };
  const callOrCheck = (kind: ActionKind) => {
    if (!acting && kind === callKind && has(callKind)) onAction(callKind, callKind === "call" ? toCall : undefined);
  };

  useHeroKeys(!acting, {
    enter: input ? playSize : undefined, fold, call: () => callOrCheck("call"), check: () => callOrCheck("check"),
    smaller: () => step(-1), bigger: () => step(1),
  });

  const sizeLabel = allIn ? t("controls.allIn", { n: formatChips(allInTo) })
    : t(sizeKind === "bet" ? "controls.bet" : "controls.raiseTo", { n: formatChips(amount) });
  const note = input ? sizeNote(amount, input, list, {
    bb: (n) => t("size.bb", { n }), pot: t("size.pot"),
    share: (share) => t("size.share", { share }), percent: (n) => t("size.percent", { n }),
  }, numberLocale()) : "";

  return (
    <div className="hero-controls" data-testid="hero-controls">
      <div className="hero-info">
        <span>{t("controls.toCall", { n: formatChips(toCall) })}</span>
        <span>{t("controls.pot", { n: formatChips(pot) })}</span>
        <span>{t("controls.stack", { n: formatChips(stack) })}</span>
        {has("raise") && (
          <span className="raise-hint">{t("controls.minRaise", { n: formatChips(meta("raise")?.minAmount ?? 0) })}</span>
        )}
      </div>
      <div className="controls-row">
        <button className="btn btn-fold" disabled={acting || toCall === 0} aria-label={t("controls.foldTitle")}
          title={toCall === 0 ? t("controls.checkFree") : t("controls.foldTitle")} onClick={fold}>
          {showLabels ? t("controls.fold") : GLYPH.fold}
        </button>
        <button className="btn btn-call" disabled={acting || !has(callKind)}
          aria-label={callKind === "call" ? t("controls.callTitle", { n: formatChips(toCall) }) : t("controls.checkTitle")}
          title={callKind === "call" ? t("controls.callTitle", { n: formatChips(toCall) }) : t("controls.checkTitle")}
          onClick={() => callOrCheck(callKind)}>
          {showLabels ? callLabel : GLYPH[callKind]}
        </button>
        {sizeKind && (
          <button className="btn btn-size" disabled={acting} aria-label={sizeLabel} title={sizeLabel}
            data-testid="size-play" onClick={playSize}>
            {showLabels ? <>{sizeLabel}<small>{note}<span className="key-hint"> · Enter</span></small></> : GLYPH[sizeKind]}
          </button>
        )}
        {has("all_in") && (
          <button className="btn btn-allin" disabled={acting} aria-label={t("controls.allInTitle", { n: formatChips(allInTo) })}
            title={t("controls.allInTitle", { n: formatChips(allInTo) })} onClick={() => onAction("all_in", allInTo)}>
            {showLabels ? t("controls.allIn", { n: formatChips(allInTo) }) : GLYPH.all_in}
          </button>
        )}
      </div>
      {input && (
        <BetSizer presets={list} selected={current.selected} amount={amount} min={input.min} max={input.max}
          step={stepSize(input)} note={note} disabled={acting}
          onPreset={(p) => setAmount(p.amount, p.key)} onAmount={(n) => setAmount(n)} />
      )}
    </div>
  );
}
