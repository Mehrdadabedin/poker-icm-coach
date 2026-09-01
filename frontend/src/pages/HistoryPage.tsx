import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { request } from "../services/api";

type HandRow = {
  handNumber: number; heroPosition: string; pot: number; winnerSeats: number[];
  net: number; heroDecision: string | null; coachRecommendation: string | null;
  grade: string | null; level: number; blindLevel: string;
};

/** HAND HISTORY: auto-loads the active tournament table and groups by blind level. */
export function HistoryPage() {
  const navigate = useNavigate();
  const [hands, setHands] = useState<HandRow[]>([]);
  const [tableId, setTableId] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // the app has a single active tournament table - auto-detect it
    request<{ tableId: string | null }>("/api/active-table")
      .then((d) => {
        if (d.tableId) {
          setTableId(d.tableId);
          request<{ hands: HandRow[] }>(`/api/game/${d.tableId}/hands`)
            .then((data) => setHands(data.hands))
            .catch(() => undefined);
        }
      })
      .catch(() => undefined)
      .finally(() => setLoaded(true));
  }, []);

  const load = (id: string) => {
    setTableId(id);
    if (!id) { setHands([]); return; }
    request<{ hands: HandRow[] }>(`/api/game/${id}/hands`)
      .then((data) => setHands(data.hands))
      .catch(() => undefined);
  };

  // group by blind level (Level 1, Level 2, ...) preserving hand order
  const groups = new Map<number, HandRow[]>();
  for (const h of hands) {
    const list = groups.get(h.level) ?? [];
    list.push(h);
    groups.set(h.level, list);
  }

  return (
    <div className="page" data-testid="history-page">
      <h1 className="screen-title">HAND HISTORY</h1>
      <div className="toolbar">
        <input placeholder="table id" value={tableId} onChange={(e) => load(e.target.value)} data-testid="history-table-input" />
        <button className="btn btn-small" onClick={() => navigate("/")}>HOME</button>
      </div>
      <p className="note">
        {tableId ? `Tournament table: ${tableId} — ${hands.length} completed hand(s)` : loaded ? "No active table yet — start a practice session first." : "Loading active table…"}
      </p>
      {[...groups.entries()].map(([level, rows]) => (
        <div key={level} className="history-group" data-testid={`history-level-${level}`}>
          <h3 className="history-group-title">LEVEL {level} ({rows[0].blindLevel} blinds)</h3>
          <table className="data-table">
            <thead>
              <tr><th>#</th><th>Pos</th><th>Pot</th><th>Winners</th><th>Net</th><th>Hero</th><th>Coach</th><th>Grade</th></tr>
            </thead>
            <tbody>
              {rows.map((h) => (
                <tr key={h.handNumber}>
                  <td>{h.handNumber}</td><td>{h.heroPosition}</td><td>{h.pot.toLocaleString()}</td>
                  <td>{h.winnerSeats.join(",")}</td>
                  <td className={h.net >= 0 ? "pos" : "neg"}>{h.net >= 0 ? "+" : ""}{h.net.toLocaleString()}</td>
                  <td>{h.heroDecision ?? "—"}</td><td>{h.coachRecommendation ?? "—"}</td>
                  <td>{h.grade ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
      {hands.length === 0 && loaded && <p className="note">No completed hands recorded yet.</p>}
    </div>
  );
}
