/* A04/A05/A07 — Admin dashboard shell + registered-account metrics.

A04: shell layout and section navigation (driven by the A07 section
registry). A05: the Dashboard section displays live metrics from the
protected Admin summary API (GET /api/admin/users/summary). The backend is
the security boundary: the probe result decides between ready, forbidden
(403) and failure; a 401 clears the stale session and redirects to login.
Only the API summary is shown - never a frontend-computed count, never
users.json.
*/
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ADMIN_SECTIONS, findAdminSection } from "../components/AdminSections";
import { Copyright } from "../components/Copyright";
import { AdminSummary, AuthError, adminSummary, clearAuth } from "../services/api";

type ProbeResult =
  | { status: "ok"; summary: AdminSummary }
  | { status: "forbidden" }
  | { status: "failure" };

async function adminProbe(): Promise<ProbeResult> {
  try {
    return { status: "ok", summary: await adminSummary() };
  } catch (error) {
    if (error instanceof AuthError) throw error; // 401: handled by the caller
    if (error instanceof Error && error.message.includes("API 403")) {
      return { status: "forbidden" };
    }
    return { status: "failure" };
  }
}

type View =
  | { status: "checking" }
  | { status: "ready"; summary: AdminSummary }
  | { status: "forbidden" }
  | { status: "failure" };

export function AdminPage() {
  const navigate = useNavigate();
  const params = useParams();
  const section = findAdminSection(params.section);
  const [view, setView] = useState<View>({ status: "checking" });

  useEffect(() => {
    adminProbe()
      .then((result) => {
        if (result.status === "ok") {
          setView({ status: "ready", summary: result.summary });
        } else {
          setView({ status: result.status });
        }
      })
      .catch((error: unknown) => {
        if (error instanceof AuthError) {
          clearAuth();
          navigate("/login", {
            state: { authNotice: "Session expired \u2014 please log in again." },
          });
          return;
        }
        setView({ status: "failure" });
      });
  }, [navigate]);

  if (view.status === "checking") {
    return (
      <div className="page admin-page" data-testid="admin-page">
        <h1 className="screen-title">ADMIN</h1>
        <p className="note" data-testid="admin-loading">Loading…</p>
        <Copyright />
      </div>
    );
  }

  if (view.status !== "ready") {
    const refused = view.status === "forbidden";
    return (
      <div className="page admin-page" data-testid="admin-page">
        <h1 className="screen-title">ADMIN</h1>
        {refused ? (
          <div className="admin-denied" data-testid="admin-denied" role="alert">
            <b>Admin access required</b>
            <p>This area is restricted to authorized administrators.</p>
          </div>
        ) : (
          <div className="admin-denied" data-testid="admin-error" role="alert">
            <b>Dashboard unavailable</b>
            <p>Could not load Admin metrics. Please try again later.</p>
          </div>
        )}
        <div className="toolbar">
          <button className="btn btn-small" onClick={() => navigate("/")}>HOME</button>
        </div>
        <Copyright />
      </div>
    );
  }

  return (
    <div className="page admin-page" data-testid="admin-page">
      <h1 className="screen-title">ADMIN</h1>
      <div className="admin-shell">
        <nav className="admin-nav" data-testid="admin-nav" aria-label="Admin sections">
          {ADMIN_SECTIONS.map((entry) => (
            <Link
              key={entry.id}
              className={`btn admin-nav-btn${entry.id === section.id ? " admin-nav-active" : ""}`}
              to={`/admin/${entry.id}`}
              data-testid={`admin-nav-${entry.id}`}
            >
              {entry.icon} {entry.label}
            </Link>
          ))}
        </nav>
        <section className="admin-panel" data-testid={`admin-section-${section.id}`}>
          {section.render({ summary: view.summary })}
        </section>
      </div>
      <Copyright />
    </div>
  );
}
