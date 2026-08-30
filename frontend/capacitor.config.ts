import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.pokericmcoach.app",
  appName: "Poker ICM Coach",
  webDir: "dist",
  server: {
    // The APK talks to the FastAPI backend over the network.
    // Change this to your server's LAN/IP address for device testing.
    url: "http://localhost:8000",
    cleartext: true,
  },
};

export default config;
