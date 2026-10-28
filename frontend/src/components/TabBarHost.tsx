import { useEffect } from "react";
import { TabBar } from "./TabBar";
import { useTabBarShown } from "../hooks/useTabBarShown";

/** Shows the tab bar where plan 099 wants it and keeps room for it at the page bottom. */
export function TabBarHost() {
  const show = useTabBarShown();
  useEffect(() => {
    document.body.classList.toggle("has-tab-bar", show);
    return () => document.body.classList.remove("has-tab-bar");
  }, [show]);
  return show ? <TabBar /> : null;
}
