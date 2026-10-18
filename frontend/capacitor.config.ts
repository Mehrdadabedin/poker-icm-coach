import type { CapacitorConfig } from "@capacitor/cli";

// The app shows the live site, so it always has the latest version and needs
// no backend change: the API already allows icmbot.one. Google sign-in does
// not work inside an app web view (Google blocks it); username and password do.
const config: CapacitorConfig = {
  appId: "com.pokericmcoach.app",
  appName: "ICMBOT",
  webDir: "dist",
  server: {
    url: "https://icmbot.one",
    cleartext: false,
  },
};

export default config;
