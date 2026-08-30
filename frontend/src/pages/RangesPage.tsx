import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { rangeGrid } from "../services/api";

const COLUMNS = ["A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"];
const POSITIONS = ["UTG", "UTG+1", "MP", "LJ", "HJ", "CO", "BTN", "SB", "BB"];

/** RANGES screen: baseline 13x13 matrix per position and stack depth. */
export function RangesPage() {
  const navigate = useNavigate();
  const [position, setPosition] = useState("BTN");
  const [depth, setDepth] = useState(30);
  const [grid, setGrid] = useState<string[][]>([]);

  useEffect(() => {
    rangeGrid(position, depth).then((data) => setGrid(data.grid)).catch(() => undefined);
  }, [position, depth]);

  return (
    <div className="page" data-testid="ranges-page">
      <h1 className="screen-title">BASELINE STRATEGY RANGES</h1>
      <p className="note">Heuristic practice ranges — not solver-exact.</p>
      <div className="toolbar">
        <select value={position} onChange={(e) => setPosition(e.target.value)}>
          {POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={depth} onChange={(e) => setDepth(Number(e.target.value))}>
          {[100, 50, 30, 20, 12, 8, 5].map((d) => <option key={d} value={d}>{d} BB</option>)}
        </select>
        <button className="btn btn-small" onClick={() => navigate("/")}>HOME</button>
      </div>
      <div className="matrix-scroll">
        <table className="range-matrix" data-testid="range-matrix">
          <thead>
            <tr>
              <th></th>
              {COLUMNS.map((c) => <th key={c}>{c}</th>)}
            </tr>
          </thead>
          <tbody>
            {grid.map((row, i) => (
              <tr key={i}>
                <th>{COLUMNS[i]}</th>
                {row.map((cell, j) => (
                  <td key={j} className={`cell-${cell.toLowerCase().replace(/[^a-z]/g, "-")}`}>
                    {cell === "FOLD" ? "·" : cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="legend">OPEN RAISE · CALL · 3-BET · OPEN JAM · FOLD</div>
    </div>
  );
}
