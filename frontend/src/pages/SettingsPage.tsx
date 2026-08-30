import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { request } from "../services/api";

type Settings = { startingStack: number; startingSmallBlind: number; startingBigBlind: number; blindLevelMinutes: number; fastMode: boolean };

/** SETTINGS screen: tournament defaults from the backend. */
export function SettingsPage() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    request<Settings>("/api/settings").then(setSettings).catch(() => undefined);
  }, []);

  return (
    <div className="page" data-testid="settings-page">
      <h1 className="screen-title">TOURNAMENT SETTINGS</h1>
      <button className="btn btn-small" onClick={() => navigate("/")}>HOME</button>
      {settings && (
        <table className="data-table">
          <tbody>
            <tr><td>Starting stack</td><td>{settings.startingStack.toLocaleString()}</td></tr>
            <tr><td>Starting blinds</td><td>{settings.startingSmallBlind} / {settings.startingBigBlind}</td></tr>
            <tr><td>Blind level duration</td><td>{settings.blindLevelMinutes} minutes</td></tr>
            <tr><td>Fast mode</td><td>{settings.fastMode ? "on" : "off"}</td></tr>
          </tbody>
        </table>
      )}
      <p className="note">Defaults live in .env / backend settings. Payouts: 40/25/15/10/6/4.</p>
    </div>
  );
}
