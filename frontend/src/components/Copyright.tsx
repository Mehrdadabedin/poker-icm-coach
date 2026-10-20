import { useT } from "../i18n/I18n";

/** App-wide copyright footer shown on the right of each page's nav area. */
export function Copyright() {
  const t = useT();
  return (
    <footer className="app-footer" data-testid="app-footer">
      {t("app.copyright")}
    </footer>
  );
}
