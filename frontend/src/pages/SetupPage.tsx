import { AppearancePicker } from "../components/AppearancePicker";
import { ADMIN, SETUP } from "../components/menuEntries";
import { TabPage } from "../components/TabPage";
import { useIsAdmin } from "../hooks/useIsAdmin";

export function SetupPage() {
  const isAdmin = useIsAdmin();
  return (
    <TabPage title="tabs.setup.title" entries={isAdmin ? [...SETUP, ADMIN] : SETUP} testId="setup-page">
      <AppearancePicker />
    </TabPage>
  );
}
