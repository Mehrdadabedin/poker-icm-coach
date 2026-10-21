/* Plan 094: Admin review of player photos. A photo shows on the player's seat
only after an Admin approves it here. The admin pages stay English (only the
owner uses them). */
import { useEffect, useState } from "react";
import { pendingPortraits, reviewPortrait, type PendingPortrait } from "../services/portraitApi";

type State = { status: "loading" } | { status: "ready"; rows: PendingPortrait[] } | { status: "error" };

export function AdminPortraitsView() {
  const [state, setState] = useState<State>({ status: "loading" });
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    pendingPortraits()
      .then((r) => { if (!cancelled) setState({ status: "ready", rows: r.portraits }); })
      .catch(() => { if (!cancelled) setState({ status: "error" }); });
    return () => { cancelled = true; };
  }, []);

  const decide = async (username: string, decision: "approve" | "reject") => {
    setBusy(username);
    setActionError(false);
    try {
      await reviewPortrait(username, decision);
      setState((s) => (s.status === "ready" ? { status: "ready", rows: s.rows.filter((r) => r.username !== username) } : s));
    } catch {
      setActionError(true);
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <h2 className="admin-section-title">Photos</h2>
      {state.status === "loading" && <p className="note">Loading photos…</p>}
      {state.status === "error" && (
        <div className="admin-message" role="alert" data-testid="admin-portraits-error">Could not load the photos.</div>
      )}
      {actionError && <p className="admin-action-error" role="alert">That review did not save. Try again.</p>}
      {state.status === "ready" && state.rows.length === 0 && (
        <p className="admin-placeholder" data-testid="admin-portraits-empty">No photos are waiting for review.</p>
      )}
      {state.status === "ready" && state.rows.length > 0 && (
        <div className="admin-portraits" data-testid="admin-portraits">
          {state.rows.map((row) => (
            <div key={row.username} className="admin-portrait" data-testid={`admin-portrait-${row.username}`}>
              <img src={row.image} alt={`Photo from ${row.username}`} />
              <p className="admin-portrait-name">{row.username}</p>
              <div className="admin-portrait-actions">
                <button type="button" className="admin-action" disabled={busy !== null}
                  onClick={() => void decide(row.username, "approve")} data-testid={`approve-${row.username}`}>
                  Approve
                </button>
                <button type="button" className="admin-action admin-action-danger" disabled={busy !== null}
                  onClick={() => void decide(row.username, "reject")} data-testid={`reject-${row.username}`}>
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
