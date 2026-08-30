import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { request } from "../services/api";

type HandRow = { handNumber: number; heroPosition: string; pot: number; winnerSeats: number[]; net: number; heroDecision: string | null; coachRecommendation: string | null; grade: string | null };

/** HAND HISTORY screen: review completed hands from the session store. */
export function HistoryPage() {
  const navigate = useNavigate();
  const [hands, setHands] = useState<HandRow[]>([]);
  const [tableId, setTableId] = useState("");

  useEffect(() => {
    if (!tableId) return;
    request<{ hands: HandRow[] }>(`/api/game/${tableId}/hands`)
      .then((data) => setHands(data.hands))
      .catch(() => undefined);
  }, [tableId]);

  return (
    <div className="page" data-testid="history-page">
      <h1 className="screen-title">HAND HISTORY</h1>
      <div className="toolbar">
        <input placeholder="table id" value={tableId} onChange={(e) => setTableId(e.target.value)} />
        <button className="btn btn-small" onClick={() => navigate("/")}>HOME</button>
      </div>
      <table className="data-table">
        <thead>
          <tr><th>#</th><th>Pos</th><th>Pot</th><th>Winners</th><th>Net</th><th>Hero</th><th>Coach</th><th>Grade</th></tr>
        </thead>
        <tbody>
          {hands.map((h) => (
            <tr key={h.handNumber}>
              <td>{h.handNumber}</td><td>{h.heroPosition}</td><td>{h.pot.toLocaleString()}</td>
              <td>{h.winnerSeats.join(",")}</td>
              <td className={h.net >= 0 ? "pos" : "neg"}>{h.net >= 0 ? "+" : ""}{h.net}</td>
              <td>{h.heroDecision ?? "—"}</td><td>{h.coachRecommendation ?? "—"}</td>
              <td>{h.grade ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {hands.length === 0 && <p className="note">Enter a table id (from HOME → START PRACTICE) to see hands.</p>}
    </div>
  );
}
