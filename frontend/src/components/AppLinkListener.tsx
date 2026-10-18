import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { finishAppGoogle } from "../services/appGoogle";
import { inAndroidApp } from "../services/platform";

/** In the Android app, follows the link Chrome hands back after Google sign-in
 * (plan 088). If Android closed the app meanwhile, the link is the launch URL;
 * otherwise it arrives as an event. */
export function AppLinkListener() {
  const navigate = useNavigate();
  useEffect(() => {
    if (!inAndroidApp()) return undefined;
    let stopped = false;
    let remove: (() => Promise<void>) | undefined;
    const follow = async (url: string) => {
      const to = await finishAppGoogle(url);
      if (!to || stopped) return;
      void import("@capacitor/browser").then(({ Browser }) => Browser.close()).catch(() => undefined);
      navigate(to, { replace: true });
    };
    void import("@capacitor/app").then(async ({ App }) => {
      const handle = await App.addListener("appUrlOpen", ({ url }) => void follow(url));
      if (stopped) return handle.remove();
      remove = () => handle.remove();
      const launch = await App.getLaunchUrl();
      if (launch?.url) await follow(launch.url);
      return undefined;
    });
    return () => {
      stopped = true;
      void remove?.();
    };
  }, [navigate]);
  return null;
}
