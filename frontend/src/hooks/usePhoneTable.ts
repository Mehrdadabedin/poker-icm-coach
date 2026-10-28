import { useState } from "react";
import { useFlash } from "./useFlash";
import { useStoredFlag } from "./useStoredFlag";

export const GRADE_SECONDS = 3;

/** What an upright phone remembers and shows on the table (plan 101): the
 * second status line, the coach strip (folded or not), the coach sheet, the
 * history drawer and the grade that flashes for 3 seconds. */
export function usePhoneTable(comparison: Record<string, string> | null) {
  const [details, setDetails] = useStoredFlag("icmbot.tableDetails", false);
  const [stripOpen, setStripOpen] = useStoredFlag("icmbot.coachStrip", true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const grade = useFlash(comparison, GRADE_SECONDS * 1000);
  return {
    details, setDetails, stripOpen, grade, sheetOpen, drawerOpen,
    setStripOpen: (open: boolean) => { setStripOpen(open); setSheetOpen(false); },
    setSheetOpen: (open: boolean) => { setSheetOpen(open); if (open) setDrawerOpen(false); },
    setDrawerOpen: (open: boolean) => { setDrawerOpen(open); if (open) setSheetOpen(false); },
  };
}
