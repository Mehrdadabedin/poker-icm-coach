import { useState } from "react";
import { icmEquities } from "../services/icmApi";
import { PageHeader } from "../components/PageHeader";
import { Copyright } from "../components/Copyright";
import { useT } from "../i18n/I18n";
import { localFixed } from "../i18n/lang";
import type { MessageKey } from "../i18n/messages/en";
import { formatChips } from "../models/game";

interface ResultRow {
  player: number;
  stack: number;
  chipShare: number;
  equity: number;
  prizeValue: number;
  difference: number;
}

function updateArray(arr: number[], i: number, val: number): number[] {
  return arr.map((v, idx) => (idx === i ? val : v));
}

export function IcmCalculatorPage() {
  const t = useT();
  const [prizePool, setPrizePool] = useState(1000);
  const [stacks, setStacks] = useState([45000, 30000, 20000]);
  const [payoutPercents, setPayoutPercents] = useState([50, 30, 20]);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [error, setError] = useState<MessageKey | "">("");
  const [loading, setLoading] = useState(false);

  const validate = (): MessageKey | "" => {
    if (!(prizePool > 0)) return "icm.err.pool";
    if (stacks.length < 2) return "icm.err.fewPlayers";
    if (stacks.length > 9) return "icm.err.manyPlayers";
    if (payoutPercents.length < 1) return "icm.err.fewPayouts";
    if (payoutPercents.length > stacks.length) return "icm.err.morePayouts";
    for (const stack of stacks) {
      if (!Number.isInteger(stack) || stack <= 0) return "icm.err.stack";
    }
    for (const pct of payoutPercents) {
      if (pct <= 0) return "icm.err.payout";
    }
    if (payoutPercents.reduce((a, b) => a + b, 0) > 100) return "icm.err.over100";
    return "";
  };

  const handleCalculate = async () => {
    const validationErr = validate();
    if (validationErr) { setError(validationErr); return; }
    setError("");
    setLoading(true);
    try {
      const data = await icmEquities(stacks, payoutPercents.map((p) => p / 100));
      const totalChips = stacks.reduce((a, b) => a + b, 0);
      setResults(stacks.map((stack, i) => {
        const chipShare = (stack / totalChips) * 100;
        const equity = data.equities[i];
        return {
          player: i + 1, stack, chipShare, equity: equity * 100,
          prizeValue: equity * prizePool, difference: equity * 100 - chipShare,
        };
      }));
    } catch {
      setError("icm.err.server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page" data-testid="icm-calculator-page">
      <PageHeader />
      <h1 className="screen-title">{t("icm.title")}</h1>
      <div className="icm-form">
        <div className="icm-section">
          <label className="icm-label">
            {t("icm.prizePool")}
            <input type="number" value={prizePool} onChange={(e) => setPrizePool(Number(e.target.value))} data-testid="prize-pool-input" className="icm-input" />
          </label>
        </div>
        <div className="icm-section">
          <h3>{t("icm.players")}</h3>
          {stacks.map((stack, i) => (
            <div key={i} className="icm-row">
              <label className="icm-label">
                {t("icm.stack", { n: i + 1 })}
                <input type="number" value={stack} onChange={(e) => setStacks(updateArray(stacks, i, Number(e.target.value)))} data-testid={`stack-input-${i}`} className="icm-input" />
              </label>
              <button onClick={() => setStacks(stacks.filter((_, idx) => idx !== i))} disabled={stacks.length <= 2} className="icm-btn-small" data-testid={`remove-player-${i}`}>{t("icm.remove")}</button>
            </div>
          ))}
          <button onClick={() => stacks.length < 9 && setStacks([...stacks, 10000])} disabled={stacks.length >= 9} className="icm-btn" data-testid="add-player-btn">{t("icm.addPlayer")}</button>
        </div>
        <div className="icm-section">
          <h3>{t("icm.payouts")}</h3>
          {payoutPercents.map((pct, i) => (
            <div key={i} className="icm-row">
              <label className="icm-label">
                {t("icm.place", { n: i + 1 })}
                <input type="number" value={pct} onChange={(e) => setPayoutPercents(updateArray(payoutPercents, i, Number(e.target.value)))} data-testid={`payout-input-${i}`} className="icm-input" />
              </label>
              <button onClick={() => setPayoutPercents(payoutPercents.filter((_, idx) => idx !== i))} disabled={payoutPercents.length <= 1} className="icm-btn-small" data-testid={`remove-payout-${i}`}>{t("icm.remove")}</button>
            </div>
          ))}
          <button onClick={() => payoutPercents.length < 9 && setPayoutPercents([...payoutPercents, 10])} disabled={payoutPercents.length >= 9} className="icm-btn" data-testid="add-payout-btn">{t("icm.addPayout")}</button>
        </div>
        <button onClick={handleCalculate} disabled={loading} className="icm-btn icm-btn-primary" data-testid="calculate-btn">{t(loading ? "icm.calculating" : "icm.calculate")}</button>
        {error && <p className="icm-error" data-testid="error-message">{t(error)}</p>}
      </div>
      {results.length > 0 && (
        <div className="icm-results">
          <table className="icm-table" data-testid="icm-results-table">
            <thead>
              <tr><th>{t("icm.col.player")}</th><th>{t("icm.col.stack")}</th><th>{t("icm.col.chip")}</th><th>{t("icm.col.icm")}</th>
                <th>{t("icm.col.prize")}</th><th>{t("icm.col.difference")}</th></tr>
            </thead>
            <tbody>
              {results.map((row) => (
                <tr key={row.player} data-testid={`icm-row-${row.player}`}>
                  <td>{row.player}</td><td>{formatChips(row.stack)}</td><td>{localFixed(row.chipShare, 2)}%</td>
                  <td>{localFixed(row.equity, 2)}%</td><td>{localFixed(row.prizeValue, 2)} EUR</td>
                  <td className={row.difference >= 0 ? "pos" : "neg"}>{row.difference >= 0 ? "+" : ""}{localFixed(row.difference, 2)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="icm-explanation">{t("icm.explanation")}</p>
        </div>
      )}
      <Copyright />
    </div>
  );
}
