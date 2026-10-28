import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useT } from "../i18n/I18n";
import { AuthError, clearAuth, createTournament } from "../services/api";

/** Start practice for a Free player (plan 100): no lineup is sent, the server
 * deals 8 random bots, and the table opens at once. */
export function useStartPractice(): () => Promise<void> {
  const navigate = useNavigate();
  const t = useT();
  return useCallback(async () => {
    try {
      const state = await createTournament(10);
      navigate(`/table/${state.tableId}`);
    } catch (err) {
      if (err instanceof AuthError) {
        clearAuth();
        navigate("/login", { state: { authNotice: t("botsPage.expired") } });
      }
    }
  }, [navigate, t]);
}
