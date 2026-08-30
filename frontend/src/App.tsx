import { useState } from "react";
import { TablePage } from "./pages/TablePage";
import { TableState } from "./models/game";
import { sampleTableState } from "./sampleState";

/** Root app: renders the practice table (more screens arrive in later parts). */
export function App() {
  const [state] = useState<TableState>(() => sampleTableState());
  return <TablePage state={state} onAction={() => undefined} />;
}
