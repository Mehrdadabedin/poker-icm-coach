/* A06 — Admin Users view: safe registered-account list with client-side search.

Consumes the existing A03 protected API (GET /api/admin/users) - the single
user-data source; users.json is never read. The backend returns exactly
{username, provider, suspended, admin} per row, so the UI shows only those safe
fields. Search is a case-insensitive presentation filter over the fetched safe
list (current scale is one bounded page). Each row can be suspended or deleted
through AdminUserActions; the table updates in place on success.
*/
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AdminUserActions } from "./AdminUserActions";
import {
  AdminUserRow,
  AuthError,
  adminUsers,
  clearAuth,
  getUsername,
} from "../services/api";

/** Bounded single page: the backend caps page size at 200, which covers the
 * current account scale without paging machinery. */
const PAGE_SIZE = 200;

type UsersState =
  | { status: "loading" }
  | { status: "ready"; rows: AdminUserRow[] }
  | { status: "error" };

export function AdminUsersView() {
  const navigate = useNavigate();
  const [state, setState] = useState<UsersState>({ status: "loading" });
  const [query, setQuery] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const replaceRow = (username: string, next: AdminUserRow | null) => {
    setActionError(null);
    setState((current) =>
      current.status !== "ready"
        ? current
        : {
            status: "ready",
            rows: next
              ? current.rows.map((row) => (row.username === username ? next : row))
              : current.rows.filter((row) => row.username !== username),
          },
    );
  };

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    adminUsers(PAGE_SIZE, 0)
      .then((response) => {
        if (!cancelled) setState({ status: "ready", rows: response.users });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (error instanceof AuthError) {
          clearAuth();
          navigate("/login", {
            state: { authNotice: "Session expired \u2014 please log in again." },
          });
          return;
        }
        setState({ status: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  if (state.status === "loading") {
    return (
      <p className="note" data-testid="admin-users-loading">Loading users…</p>
    );
  }

  if (state.status === "error") {
    return (
      <div className="admin-message" data-testid="admin-users-error" role="alert">
        <b>Users unavailable</b>
        <p>Could not load the registered users. Please try again later.</p>
      </div>
    );
  }

  const rows = state.rows;
  const needle = query.trim().toLowerCase();
  const visible = needle
    ? rows.filter((row) => row.username.toLowerCase().includes(needle))
    : rows;

  return (
    <>
      <h2 className="admin-section-title">Users</h2>
      <input
        className="admin-search"
        type="search"
        placeholder="Search by username…"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        aria-label="Search users"
        data-testid="admin-users-search"
      />
      {actionError && (
        <p className="admin-action-error" role="alert" data-testid="admin-users-action-error">
          {actionError}
        </p>
      )}
      {rows.length === 0 ? (
        <p className="admin-placeholder" data-testid="admin-users-empty">
          No registered users.
        </p>
      ) : visible.length === 0 ? (
        <p className="admin-placeholder" data-testid="admin-users-nomatch">
          No users found.
        </p>
      ) : (
        <div className="admin-table-wrap" data-testid="admin-users-wrap">
          <table className="admin-table" data-testid="admin-users-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Provider</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr key={row.username} data-testid={`admin-user-${row.username}`}>
                  <td>{row.username}</td>
                  <td>
                    <span className={`admin-provider admin-provider-${row.provider}`}>
                      {row.provider === "google" ? "Google" : "Local"}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`admin-status admin-status-${row.suspended ? "suspended" : "active"}`}
                      data-testid={`admin-status-${row.username}`}
                    >
                      {row.suspended ? "Suspended" : "Active"}
                    </span>
                  </td>
                  <td>
                    <AdminUserActions
                      row={row}
                      currentUser={getUsername()}
                      onChanged={(next) => replaceRow(row.username, next)}
                      onError={setActionError}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
