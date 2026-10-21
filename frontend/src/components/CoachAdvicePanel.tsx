import { useT } from "../i18n/I18n";
import { actionWord, coachReason, factorRow, tr } from "../i18n/coach";
import { localFixed } from "../i18n/lang";
import { formatChips, type CoachAdvice } from "../models/game";

export type Advice = CoachAdvice & {
  confidence: number;
  ev: { winProb: number; loseProb: number; pot: number; toCall: number; chipEv: number; evClass: string; chipRecommendation: string } | null;
  outs: { outs: number; unknown: number; improveTurn: number; improveRiver: number; winProb: number; method: string } | null;
  education: string;
};

const pct = (p: number) => `${localFixed(p * 100, 1)}%`;

/** The ICM Coach tool's answer: action, EV, outs and the factor rows. */
export function CoachAdvicePanel({ advice }: { advice: Advice }) {
  const t = useT();
  const action = actionWord(advice.recommendedAction, t);
  const { ev, outs } = advice;
  return (
    <div className="coach-panel" data-testid="advice-panel">
      <h3>{t("coachPage.recommendation", { action })}</h3>
      <p className="confidence">{t("coachPage.confidence", { pct: Math.round(advice.confidence * 100) })}</p>

      {ev && (
        <div className={`ev-panel ${ev.evClass === "POSITIVE EV" ? "ev-pos" : "ev-neg"}`} data-testid="ev-panel">
          <div className="ev-row"><b>{t("coachPage.ev.chipEv")}</b> <span>{ev.chipEv >= 0 ? `+${formatChips(ev.chipEv)}` : formatChips(ev.chipEv)}</span></div>
          <div className="ev-row"><b>{t("coachPage.ev.class")}</b> <span>{tr(t, `coach.value.${ev.evClass}`, ev.evClass)}</span></div>
          <div className="ev-row"><b>{t("coachPage.ev.win")}</b> <span>{pct(ev.winProb)}</span> <b>{t("coachPage.ev.lose")}</b> <span>{pct(ev.loseProb)}</span></div>
          <div className="ev-row"><b>{t("coachPage.ev.pot")}</b> <span>{formatChips(ev.pot)}</span> <b>{t("coachPage.ev.toCall")}</b> <span>{formatChips(ev.toCall)}</span></div>
          <div className="ev-row"><b>{t("coachPage.ev.chipRec")}</b> <span>{actionWord(ev.chipRecommendation, t)}</span></div>
          <div className="ev-row ev-note">{t("coachPage.ev.icm", { action })}</div>
        </div>
      )}

      {outs && (
        <div className="outs-grid" data-testid="outs-panel">
          <span>{t("coachPage.outs")} <b>{outs.outs}</b> {t("coachPage.outs.unknown", { n: outs.unknown })}</span>
          <span>{t("coachPage.outs.turn")} <b>{pct(outs.improveTurn)}</b></span>
          <span>{t("coachPage.outs.river")} <b>{pct(outs.improveRiver)}</b></span>
          <span>{t("coachPage.outs.win")} <b>{pct(outs.winProb)}</b> ({tr(t, `coachPage.method.${outs.method}`, outs.method)})</span>
        </div>
      )}

      {advice.education && <p className="coach-education" data-testid="coach-education">{advice.education}</p>}
      <p>{coachReason(advice, t)}</p>
      <dl>
        {Object.entries(advice.detail).map(([k, v]) => {
          const [label, value] = factorRow(k, v, advice, t);
          return <div key={k} className="coach-row"><dt>{label}</dt><dd>{value}</dd></div>;
        })}
      </dl>
    </div>
  );
}
