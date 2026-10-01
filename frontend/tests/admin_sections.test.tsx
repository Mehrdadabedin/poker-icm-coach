/* A07 tests: Admin section registry (single source of truth).
 * The registry drives the shell's navigation and content; unknown ids fall
 * back to Dashboard. Rendering behavior itself is covered by admin.test.tsx
 * and admin_users.test.tsx through the real AdminPage. */
import { describe, expect, it } from "vitest";
import { ADMIN_SECTIONS, findAdminSection } from "../src/components/AdminSections";

describe("Admin section registry (A07)", () => {
  it("defines exactly the five Admin sections once each", () => {
    expect(ADMIN_SECTIONS.map((s) => s.id)).toEqual([
      "dashboard",
      "users",
      "activity",
      "bot-profiles",
      "future",
    ]);
    const ids = ADMIN_SECTIONS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const section of ADMIN_SECTIONS) {
      expect(section.label.length).toBeGreaterThan(0);
      expect(section.icon.length).toBeGreaterThan(0);
      expect(typeof section.render).toBe("function");
    }
  });

  it("falls back to Dashboard for unknown or missing ids", () => {
    expect(findAdminSection("users").id).toBe("users");
    expect(findAdminSection("nonsense").id).toBe("dashboard");
    expect(findAdminSection(undefined).id).toBe("dashboard");
  });

  it("keeps the implemented sections on the registry", () => {
    const dashboard = ADMIN_SECTIONS.find((s) => s.id === "dashboard");
    const users = ADMIN_SECTIONS.find((s) => s.id === "users");
    expect(dashboard).toBeDefined();
    expect(users).toBeDefined();
    expect(users?.label).toBe("Users");
  });
});
