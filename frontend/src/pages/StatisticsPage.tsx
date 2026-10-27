import { useEffect, useState } from "react";
import { request } from "../services/api";
import { Copyright } from "../components/Copyright";
import { PageHeader } from "../components/PageHeader";
import { GlossaryTerm, LinkedText } from "../components/GlossaryTerm";
import { useT } from "../i18n/I18n";
import { localFixed, localNumber } from "../i18n/lang";
import { formatChips } from "../models/game";

type Stats = { handsPlayed: number; handsWon: number; vpip: number; pfr: number; aggression: number; averagePot: number; bbWonLost: number; chipProfit: number; coachAgreement: number; icmMistakes: number; positionPerformance: Record<string, number> };

const card = (label: string, value: string, term?: string, extra?: string) => (
  <div className="stat-card" key={label}>
    <div className="stat-value">{value}</div>
    <div className="stat-label">{term ? <GlossaryTerm id={term}>{label}</GlossaryTerm> : label}</div>
    {extra && <div className="stat-extra">{extra}</div>}
  </div>
);

/** STATISTICS screen: session aggregates from the API. */
export function StatisticsPage() {
  const t = useT();
  const [stats, setStats] = useState<Stats | null>(null);
  const [tableId, setTableId] = useState("");

  useEffect(() => {
    if (!tableId) return;
    request<Stats>(`/api/game/${tableId}/statistics`)
      .then(setStats)
      .catch(() => undefined);
  }, [tableId]);


  return (
    <div className="page" data-testid="statistics-page">
      <PageHeader />
      <h1 className="screen-title">{t("stats.title")}</h1>
      <div className="toolbar">
        <input placeholder={t("stats.tableId")} value={tableId} onChange={(e) => setTableId(e.target.value)} />
      </div>
      {stats && (
        <>
          <div className="stat-grid">
            {card(t("stats.hands"), String(stats.handsPlayed))}
            {card(t("stats.won"), String(stats.handsWon))}
            {card("VPIP", `${localFixed(stats.vpip * 100, 1)}%`, "vpip")}
            {card("PFR", `${localFixed(stats.pfr * 100, 1)}%`, "pfr")}
            {card(t("stats.aggression"), `${localFixed(stats.aggression * 100, 0)}%`, "aggression")}
            {card(t("stats.avgPot"), formatChips(stats.averagePot), "avgPot")}
            {card(t("stats.bb"), localFixed(stats.bbWonLost, 2), "bbWonLost")}
            {card(t("stats.chips"), `${stats.chipProfit >= 0 ? "+" : ""}${formatChips(stats.chipProfit)}`, "chipPl")}
            {card(t("stats.agreement"), `${localFixed(stats.coachAgreement * 100, 0)}%`, "agreement")}
            {card(t("stats.icmMistakes"), String(stats.icmMistakes))}
          </div>
          <h3>{t("stats.positions")}</h3>
          <table className="data-table">
            <tbody>
              {Object.entries(stats.positionPerformance).map(([pos, net]) => (
                <tr key={pos}><td><LinkedText text={pos} /></td><td className={net >= 0 ? "pos" : "neg"}>{net >= 0 ? "+" : ""}{localNumber(net)}</td></tr>
              ))}
            </tbody>
          </table>
        </>
      )}
      {!stats && <p className="note">{t("stats.enterTable")}</p>}
      <Copyright />
    </div>
  );
}
