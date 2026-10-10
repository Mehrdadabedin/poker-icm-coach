import { useEffect, useState } from "react";
import { AWAY_CHANGED, awayTable, type AwayTable } from "../services/tableAway";

/** The table the hero stepped away from, kept current: it is recorded when the
 * table page closes, after the page showing it has already rendered. */
export function useAwayTable(): AwayTable | null {
  const [away, setAway] = useState<AwayTable | null>(() => awayTable());
  useEffect(() => {
    const update = () => setAway(awayTable());
    window.addEventListener(AWAY_CHANGED, update);
    window.addEventListener("storage", update); // another browser tab
    update();
    return () => {
      window.removeEventListener(AWAY_CHANGED, update);
      window.removeEventListener("storage", update);
    };
  }, []);
  return away;
}
