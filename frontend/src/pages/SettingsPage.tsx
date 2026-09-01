import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { request } from "../services/api";
import { Copyright } from "../components/Copyright";

type Settings = {
  startingStack: number; startingSmallBlind: number; startingBigBlind: number;
  blindLevelMinutes: number; fastMode: boolean;
};

/** SETTINGS screen: editable tournament defaults that affect new tournaments. */
export function SettingsPage() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    request<Settings>("/api/settings").then(setSettings).catch(() => undefined);
  }, []);

  const patch = (key: keyof Settings, value: number | boolean) => {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev));
    setSaved(false);
  };

  const save = async () => {
    if (!settings) return;
    try {
      await request<Settings>("/api/settings", {
        method: "PUT",
        body: JSON.stringify(settings),
      });
      setSaved(true);
    } catch {
      setSaved(false);
    }
  };

  return (
    <div className="page" data-testid="settings-page">
      <h1 className="screen-title">TOURNAMENT SETTINGS</h1>
      <div className="toolbar">
        <button className="btn btn-small" onClick={() => navigate("/")}>HOME</button>
      </div>
      {settings ? (
        <div className="settings-grid">
          <label>
            STARTING STACK
            <input type="number" min={100} value={settings.startingStack}
              onChange={(e) => patch("startingStack", Number(e.target.value))} data-testid="settings-stack" />
          </label>
          <label>
            STARTING SMALL BLIND
            <input type="number" min={10} value={settings.startingSmallBlind}
              onChange={(e) => patch("startingSmallBlind", Number(e.target.value))} data-testid="settings-sb" />
          </label>
          <label>
            STARTING BIG BLIND
            <input type="number" min={10} value={settings.startingBigBlind}
              onChange={(e) => patch("startingBigBlind", Number(e.target.value))} data-testid="settings-bb" />
          </label>
          <label>
            BLIND LEVEL DURATION (MINUTES)
            <input type="number" min={1} value={settings.blindLevelMinutes}
              onChange={(e) => patch("blindLevelMinutes", Number(e.target.value))} data-testid="settings-minutes" />
          </label>
          <label className="settings-check">
            <input type="checkbox" checked={settings.fastMode}
              onChange={(e) => patch("fastMode", e.target.checked)} data-testid="settings-fast" />
            FAST MODE
          </label>
          <div className="settings-actions">
            <button className="btn btn-primary" onClick={save} data-testid="settings-save">SAVE SETTINGS</button>
            <span className="note">{saved ? "Saved — next practice session uses these values." : "Defaults shown; SAVE to apply."}</span>
          </div>
        </div>
      ) : (
        <p className="note">Loading settings…</p>
      )}
      <p className="note">Payouts: 40/25/15/10/6/4. Blind schedule: 21 levels with BB ante from level 6 and three breaks.</p>
      <Copyright />
    </div>
  );
}
