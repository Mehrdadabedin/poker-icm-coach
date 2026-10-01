/* A07 — centralized Admin section registry.

Single source of truth for Admin navigation and section content. A new Admin
section is added by appending one entry here (id, label, icon, render) - the
AdminPage shell consumes this list and needs no restructuring. Sections that
belong to later atomic tasks (Poker Activity, BOT Profiles, future modules)
stay as structural placeholders; no business logic lives here.
*/
import type { ReactNode } from "react";
import type { AdminSummary } from "../services/api";
import { AdminUsersView } from "./AdminUsersView";

/** Data the Admin shell hands to every section renderer. */
export interface AdminSectionProps {
  summary: AdminSummary;
}

export interface AdminSection {
  id: string;
  label: string;
  icon: string;
  render: (props: AdminSectionProps) => ReactNode;
}

/** Placeholder content for sections implemented in later atomic tasks. */
function placeholder(id: string, title: string, text: string): AdminSection["render"] {
  return () => (
    <>
      <h2 className="admin-section-title">{title}</h2>
      <p className="admin-placeholder" data-testid={`admin-placeholder-${id}`}>{text}</p>
    </>
  );
}

export const ADMIN_SECTIONS: AdminSection[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: "📊",
    render: ({ summary }) => (
      <div className="admin-metrics" data-testid="admin-metrics">
        <div className="admin-metric-card" data-testid="metric-total">
          <span className="admin-metric-label">Total Registered Accounts</span>
          <span className="admin-metric-value">{summary.total_registered_accounts}</span>
        </div>
        <div className="admin-metric-card" data-testid="metric-google">
          <span className="admin-metric-label">Google Accounts</span>
          <span className="admin-metric-value">{summary.google_accounts}</span>
        </div>
        <div className="admin-metric-card" data-testid="metric-local">
          <span className="admin-metric-label">Local Accounts</span>
          <span className="admin-metric-value">{summary.local_accounts}</span>
        </div>
      </div>
    ),
  },
  {
    id: "users",
    label: "Users",
    icon: "👥",
    render: () => <AdminUsersView />,
  },
  {
    id: "activity",
    label: "Poker Activity",
    icon: "♠️",
    render: placeholder(
      "activity",
      "Poker Activity",
      "Poker activity monitoring arrives in a later release.",
    ),
  },
  {
    id: "bot-profiles",
    label: "BOT Profiles",
    icon: "🤖",
    render: placeholder(
      "bot-profiles",
      "BOT Profiles",
      "BOT Profile administration arrives in a later release.",
    ),
  },
  {
    id: "future",
    label: "Future Admin Sections",
    icon: "⚙️",
    render: placeholder(
      "future",
      "Future Admin Sections",
      "Additional Admin sections plug into this shell.",
    ),
  },
];

/** Resolve the requested section id; unknown/missing ids fall back to Dashboard. */
export function findAdminSection(id: string | undefined): AdminSection {
  return ADMIN_SECTIONS.find((section) => section.id === id) ?? ADMIN_SECTIONS[0];
}
