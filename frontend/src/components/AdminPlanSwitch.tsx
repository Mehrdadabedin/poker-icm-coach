/* The Free / Pro switch of one row in the Admin Users table (plan 100). The
 * server counts an admin as Pro whatever the stored plan says, so an admin's row
 * shows "Pro (admin)" and has no switch. */
import { useState } from "react";
import { setUserPlan, type Plan } from "../services/adminApi";
import type { AdminUserRow } from "../services/api";

interface Props {
  row: AdminUserRow;
  onChanged: (next: AdminUserRow) => void;
  onError: (message: string) => void;
}

export function AdminPlanSwitch({ row, onChanged, onError }: Props) {
  const [busy, setBusy] = useState(false);
  if (row.admin) return <span className="admin-actions-protected">Pro (admin)</span>;

  const plan: Plan = row.plan ?? "free";
  const flip = async () => {
    const next: Plan = plan === "pro" ? "free" : "pro";
    setBusy(true);
    try {
      await setUserPlan(row.username, next);
      onChanged({ ...row, plan: next });
    } catch {
      onError(`Could not change the plan of ${row.username}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button type="button" role="switch" aria-checked={plan === "pro"} aria-label={`Plan of ${row.username}`}
      className={plan === "pro" ? "admin-action admin-plan-pro" : "admin-action"} disabled={busy}
      onClick={() => void flip()} data-testid={`admin-plan-${row.username}`}>
      {plan === "pro" ? "Pro" : "Free"}
    </button>
  );
}
