import { useEffect, useRef } from "react";
import { comeBack, forgetAwayTable, stepAway } from "../services/tableAway";

/** Leaving the table stops its tournament clock; being on the table restarts it.
 *
 * Stepping away runs when the table page closes, so HOME, MY MISTAKES, the
 * browser's back button and a typed address all stop the clock the same way.
 * The restart keys off the server's `away` flag, so BACK TO TABLE, CONTINUE
 * TABLE, the back button and a reload all resume it the same way too. Closing
 * the browser runs no cleanup: that table keeps the normal idle timeout. */
export function useTableAway(tableId: string, label: string, away: boolean | undefined) {
  const labelRef = useRef(label);
  labelRef.current = label;

  useEffect(() => {
    forgetAwayTable(); // on a table, no other table is waiting
    if (!tableId) return undefined;
    return () => {
      void stepAway(tableId, labelRef.current).catch(() => undefined);
    };
  }, [tableId]);

  useEffect(() => {
    if (tableId && away) void comeBack(tableId).catch(() => undefined);
  }, [tableId, away]);
}
