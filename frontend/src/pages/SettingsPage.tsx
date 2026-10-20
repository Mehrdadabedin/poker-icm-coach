import { useEffect, useState } from "react";
import { request } from "../services/api";
import { Copyright } from "../components/Copyright";
import { PageHeader } from "../components/PageHeader";
import { useT } from "../i18n/I18n";
import { invalidateDisplayPreferences } from "../services/preferences";
import type { CardBack, SettingsPayload as Settings } from "../services/preferences";

/** SETTINGS screen: editable tournament defaults that affect new tournaments. */
export function SettingsPage() {
  const t = useT();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    request<Settings>("/api/settings").then(setSettings).catch(() => undefined);
  }, []);

  const patch = (key: keyof Settings, value: number | boolean | CardBack) => {
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
      invalidateDisplayPreferences();
      setSaved(true);
    } catch {
      setSaved(false);
    }
  };

  return (
    <div className="page" data-testid="settings-page">
      <PageHeader />
      <h1 className="screen-title">{t("settings.title")}</h1>
      {settings ? (
        <div className="settings-grid">
          <label>
            {t("settings.stack")}
            <input type="number" min={100} value={settings.startingStack}
              onChange={(e) => patch("startingStack", Number(e.target.value))} data-testid="settings-stack" />
          </label>
          <label>
            {t("settings.sb")}
            <input type="number" min={10} value={settings.startingSmallBlind}
              onChange={(e) => patch("startingSmallBlind", Number(e.target.value))} data-testid="settings-sb" />
          </label>
          <label>
            {t("settings.bb")}
            <input type="number" min={10} value={settings.startingBigBlind}
              onChange={(e) => patch("startingBigBlind", Number(e.target.value))} data-testid="settings-bb" />
          </label>
          <label>
            {t("settings.minutes")}
            <input type="number" min={1} value={settings.blindLevelMinutes}
              onChange={(e) => patch("blindLevelMinutes", Number(e.target.value))} data-testid="settings-minutes" />
          </label>
          <label className="settings-check">
            <input type="checkbox" checked={settings.fastMode}
              onChange={(e) => patch("fastMode", e.target.checked)} data-testid="settings-fast" />
            {t("settings.fast")}
          </label>
          <label className="settings-check">
    <input type="checkbox" checked={settings.showActionLabels !== false}
      onChange={(e) => patch("showActionLabels", e.target.checked)}
      data-testid="settings-show-action-labels" />
    {t("settings.actionLabels")}
  </label>
  <label className="settings-check">
    <input type="checkbox" checked={settings.showResultLabels !== false}
      onChange={(e) => patch("showResultLabels", e.target.checked)}
      data-testid="settings-show-result-labels" />
    {t("settings.resultLabels")}
  </label>
          <label>
            {t("settings.cardBack")}
            <select value={settings.cardBack ?? "blue"}
              onChange={(e) => patch("cardBack", e.target.value === "red" ? "red" : "blue")}
              data-testid="settings-card-back">
              <option value="blue">{t("settings.back.blue")}</option>
              <option value="red">{t("settings.back.red")}</option>
            </select>
          </label>
  <div className="settings-actions">
            <button className="btn btn-primary" onClick={save} data-testid="settings-save">{t("settings.save")}</button>
            <span className="note">{saved ? t("settings.saved") : t("settings.unsaved")}</span>
          </div>
        </div>
      ) : (
        <p className="note">{t("settings.loading")}</p>
      )}
      <p className="note">{t("settings.rules")}</p>
      <Copyright />
    </div>
  );
}
