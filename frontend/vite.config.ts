import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import type { Plugin } from "vite";
import { isLang, type Lang } from "./src/i18n/lang";
import { siteHtml } from "./src/i18n/siteMeta";

// icmbot.es is its own Render static site built with VITE_SITE_LANG=es (plan 093).
function siteHead(): Plugin {
  let site: Lang = "en";
  return {
    name: "icmbot-site-head",
    configResolved(config) {
      const asked = config.env.VITE_SITE_LANG || "en";
      if (!isLang(asked)) throw new Error(`VITE_SITE_LANG=${asked} is not a language in src/i18n/lang.ts`);
      site = asked;
    },
    transformIndexHtml: (html) => (site === "en" ? html : siteHtml(html, site)),
  };
}

export default defineConfig({
  plugins: [react(), siteHead()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:8000",
      "/ws": { target: "ws://localhost:8000", ws: true },
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
    exclude: ["e2e/**", "node_modules/**", "dist/**"],
  },
});
