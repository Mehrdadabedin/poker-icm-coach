import { useEffect, useState } from "react";
import { health } from "../services/api";

/** App-wide copyright footer shown on the right of each page's nav area. */
export function Copyright() {
  const [version, setVersion] = useState<string | null>(null);

  // The running backend is the only version source, so the footer asks it
  // instead of carrying a constant that drifts away from the release tag.
  useEffect(() => {
    let live = true;
    health()
      .then((info) => {
        if (live) setVersion(info.version);
      })
      .catch(() => {
        // An unreachable backend has no version to report, so show none.
      });
    return () => {
      live = false;
    };
  }, []);

  return (
    <footer className="app-footer" data-testid="app-footer">
      © 2026 NEXORA — Created by Mehrdad Abedin
      {version && (
        <span className="app-version" data-testid="app-version"> · v{version}</span>
      )}
    </footer>
  );
}
