import { useEffect, useState } from "react";
import {
  AWAY_CHANGED,
  awayTable,
  checkAwayTable,
  forgetAwayTable,
  type AwayTable,
} from "../services/tableAway";

/** The table the hero stepped away from, offered only once the server has
 * confirmed it still exists: a table a deploy or restart ended must not lead
 * to "table not found". The record is kept current: the table page writes it
 * when it closes, after the page showing it has already rendered. */
export function useAwayTable(): AwayTable | null {
  const [away, setAway] = useState<AwayTable | null>(null);
  useEffect(() => {
    let active = true;
    let latest = 0;
    const update = () => {
      const saved = awayTable();
      const check = ++latest;
      if (!saved) {
        setAway(null);
        return;
      }
      void checkAwayTable(saved.tableId).then((result) => {
        if (!active || check !== latest) return;
        if (result === "gone") forgetAwayTable();
        setAway(result === "live" ? saved : null);
      });
    };
    window.addEventListener(AWAY_CHANGED, update);
    window.addEventListener("storage", update); // another browser tab
    update();
    return () => {
      active = false;
      window.removeEventListener(AWAY_CHANGED, update);
      window.removeEventListener("storage", update);
    };
  }, []);
  return away;
}
