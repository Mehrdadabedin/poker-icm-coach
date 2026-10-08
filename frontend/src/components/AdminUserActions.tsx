/* Suspend / Unsuspend / Delete for one row of the Admin Users table.
 *
 * Not offered for admins or for the signed-in user: the backend refuses both,
 * so the buttons could only produce an error. Delete asks first because it
 * cannot be undone; suspending can, so it does not ask. */
import { useState } from "react";
import { deleteUser, suspendUser, unsuspendUser } from "../services/adminApi";
import type { AdminUserRow } from "../services/api";

interface Props {
  row: AdminUserRow;
  currentUser: string | null;
  /** The updated row, or null once the account is deleted. */
  onChanged: (next: AdminUserRow | null) => void;
  onError: (message: string) => void;
}

/** The backend's `detail` text when the error carries one. */
function reason(error: unknown): string {
  if (!(error instanceof Error)) return "unknown error";
  const detail = /"detail":"([^"]+)"/.exec(error.message);
  return detail ? detail[1] : error.message;
}

export function AdminUserActions({ row, currentUser, onChanged, onError }: Props) {
  const [busy, setBusy] = useState(false);

  if (row.admin || row.username === currentUser) {
    return <span className="admin-actions-protected">Protected</span>;
  }

  const run = async (action: () => Promise<unknown>, next: AdminUserRow | null) => {
    setBusy(true);
    try {
      await action();
      onChanged(next);
    } catch (error) {
      onError(`Could not update ${row.username}: ${reason(error)}`);
    } finally {
      setBusy(false);
    }
  };

  const toggle = () =>
    run(
      () => (row.suspended ? unsuspendUser(row.username) : suspendUser(row.username)),
      { ...row, suspended: !row.suspended },
    );

  const remove = () => {
    if (window.confirm(`Delete ${row.username}? This cannot be undone.`)) {
      void run(() => deleteUser(row.username), null);
    }
  };

  return (
    <div className="admin-actions">
      <button
        type="button"
        className="admin-action"
        disabled={busy}
        onClick={() => void toggle()}
        data-testid={`admin-${row.suspended ? "unsuspend" : "suspend"}-${row.username}`}
      >
        {row.suspended ? "Unsuspend" : "Suspend"}
      </button>
      <button
        type="button"
        className="admin-action admin-action-danger"
        disabled={busy}
        onClick={remove}
        data-testid={`admin-delete-${row.username}`}
      >
        Delete
      </button>
    </div>
  );
}
