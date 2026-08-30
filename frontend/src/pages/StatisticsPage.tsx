import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { request } from "../services/api";

type Stats = { handsPlayed: number; handsWon: number; vpip: number; pfr: number; aggression: number; averagePot: number; bbWonLost: number; chipProfit: number; coachAgreement: number; icmMistakes: number; positionPerformance: Record<string, number> };

/** STATISTICS screen: session aggregates from the API. */
export function StatisticsPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [tableId, setTableId] = useState("");

  useEffect(() => {
    if (!tableId) return;
    request<Stats>(`/api/game/${tableId}/statistics`)
      .then(setStats)
      .catch(() => undefined);
  }, [tableId]);

  const card = (label: string, value: string, extra?: string) => (
    <div className="stat-card" key={label}>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {extra && <div className="stat-extra">{extra}</div>}
    </div>
  );

  return (
    <div className="page" data-testid="statistics-page">
      <h1 className="screen-title">SESSION STATISTICS</h1>
      <div className="toolbar">
        <input placeholder="table id" value={tableId} onChange={(e) => setTableId(e.target.value)} />
        <button className="btn btn-small" onClick={() => navigate("/")}>HOME</button>
      </div>
      {stats && (
        <>
          <div className="stat-grid">
            {card("HANDS", String(stats.handsPlayed))}
            {card("WON", String(stats.handsWon))}
            {card("VPIP", `${(stats.vpip * 100).toFixed(1)}%`)}
            {card("PFR", `${(stats.pfr * 100).toFixed(1)}%`)}
            {card("AGGRESSION", `${(stats.aggression * 100).toFixed(0)}%`)}
            {card("AVG POT", stats.averagePot.toLocaleString())}
            {card("BB WON/LOST", stats.bbWonLost.toFixed(2))}
            {card("CHIP P/L", `${stats.chipProfit >= 0 ? "+" : ""}${stats.chipProfit.toLocaleString()}`)}
            {card("COACH AGREEMENT", `${(stats.coachAgreement * 100).toFixed(0)}%`)}
            {card("ICM MISTAKES", String(stats.icmMistakes))}
          </div>
          <h3>POSITION PERFORMANCE</h3>
          <table className="data-table">
            <tbody>
              {Object.entries(stats.positionPerformance).map(([pos, net]) => (
                <tr key={pos}><td>{pos}</td><td className={net >= 0 ? "pos" : "neg"}>{net >= 0 ? "+" : ""}{net}</td></tr>
              ))}
            </tbody>
          </table>
        </>
      )}
      {!stats && <p className="note">Enter a table id to load statistics.</p>}
    </div>
  );
}
