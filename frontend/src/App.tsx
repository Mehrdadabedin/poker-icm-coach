import { useState } from "react";
import { TablePage } from "./pages/TablePage";
import { TableState, ActionKind } from "./models/game";
import { sampleTableState } from "./sampleState";

/** Root app: renders the practice table (more screens arrive in later parts). */
export function App() {
  const [state] = useState<TableState>(() => sampleTableState());
  const handleAction = (_kind: ActionKind, _amount?: number) => {
    // Part 034 replaces this with a real API call; rendering stays local.
  };
  return <TablePage state={state} onAction={handleAction} />;
}
