import { useState } from "react";
import { icmEquities } from "../services/icmApi";
import { HomeButton } from "../components/HomeButton";
import { Copyright } from "../components/Copyright";

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
  const [prizePool, setPrizePool] = useState(1000);
  const [stacks, setStacks] = useState([45000, 30000, 20000]);
  const [payoutPercents, setPayoutPercents] = useState([50, 30, 20]);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const validate = (): string => {
    if (!(prizePool > 0)) return "Prize pool must be greater than 0";
    if (stacks.length < 2) return "At least 2 players required";
    if (stacks.length > 9) return "At most 9 players allowed";
    if (payoutPercents.length < 1) return "At least 1 payout required";
    if (payoutPercents.length > stacks.length) return "Cannot have more payouts than players";
    for (const stack of stacks) {
      if (!Number.isInteger(stack) || stack <= 0) return "Every stack must be a positive whole number";
    }
    for (const pct of payoutPercents) {
      if (pct <= 0) return "Every payout percentage must be greater than 0";
    }
    if (payoutPercents.reduce((a, b) => a + b, 0) > 100) return "Payout percentages cannot exceed 100%";
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
      setError("Could not calculate right now. Check the stacks and payouts, then try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page" data-testid="icm-calculator-page">
      <h1 className="screen-title">ICM CALCULATOR</h1>
      <div className="icm-form">
        <div className="icm-section">
          <label className="icm-label">
            Prize Pool (EUR):
            <input type="number" value={prizePool} onChange={(e) => setPrizePool(Number(e.target.value))} data-testid="prize-pool-input" className="icm-input" />
          </label>
        </div>
        <div className="icm-section">
          <h3>Players</h3>
          {stacks.map((stack, i) => (
            <div key={i} className="icm-row">
              <label className="icm-label">
                Stack {i + 1}:
                <input type="number" value={stack} onChange={(e) => setStacks(updateArray(stacks, i, Number(e.target.value)))} data-testid={`stack-input-${i}`} className="icm-input" />
              </label>
              <button onClick={() => setStacks(stacks.filter((_, idx) => idx !== i))} disabled={stacks.length <= 2} className="icm-btn-small" data-testid={`remove-player-${i}`}>Remove</button>
            </div>
          ))}
          <button onClick={() => stacks.length < 9 && setStacks([...stacks, 10000])} disabled={stacks.length >= 9} className="icm-btn" data-testid="add-player-btn">Add Player</button>
        </div>
        <div className="icm-section">
          <h3>Payouts (%)</h3>
          {payoutPercents.map((pct, i) => (
            <div key={i} className="icm-row">
              <label className="icm-label">
                Place {i + 1}:
                <input type="number" value={pct} onChange={(e) => setPayoutPercents(updateArray(payoutPercents, i, Number(e.target.value)))} data-testid={`payout-input-${i}`} className="icm-input" />
              </label>
              <button onClick={() => setPayoutPercents(payoutPercents.filter((_, idx) => idx !== i))} disabled={payoutPercents.length <= 1} className="icm-btn-small" data-testid={`remove-payout-${i}`}>Remove</button>
            </div>
          ))}
          <button onClick={() => payoutPercents.length < 9 && setPayoutPercents([...payoutPercents, 10])} disabled={payoutPercents.length >= 9} className="icm-btn" data-testid="add-payout-btn">Add Payout</button>
        </div>
        <button onClick={handleCalculate} disabled={loading} className="icm-btn icm-btn-primary" data-testid="calculate-btn">{loading ? "Calculating..." : "Calculate"}</button>
        {error && <p className="icm-error" data-testid="error-message">{error}</p>}
      </div>
      {results.length > 0 && (
        <div className="icm-results">
          <table className="icm-table" data-testid="icm-results-table">
            <thead>
              <tr><th>Player</th><th>Stack</th><th>Chip %</th><th>ICM %</th><th>Prize Value</th><th>Difference</th></tr>
            </thead>
            <tbody>
              {results.map((row) => (
                <tr key={row.player} data-testid={`icm-row-${row.player}`}>
                  <td>{row.player}</td><td>{row.stack.toLocaleString()}</td><td>{row.chipShare.toFixed(2)}%</td><td>{row.equity.toFixed(2)}%</td><td>{row.prizeValue.toFixed(2)} EUR</td>
                  <td className={row.difference >= 0 ? "pos" : "neg"}>{row.difference >= 0 ? "+" : ""}{row.difference.toFixed(2)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="icm-explanation">ICM equity represents a stack's fair share of the prize pool given current chip distribution. Short stacks receive more value than their chip percentage while big stacks receive less.</p>
        </div>
      )}
      <div className="toolbar"><HomeButton /></div>
      <Copyright />
    </div>
  );
}
