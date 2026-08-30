import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  retries: 0,
  use: {
    baseURL: "http://localhost:4173",
    headless: true,
  },
  webServer: [
    {
      command: "cd ../backend && .venv/bin/uvicorn app.main:app --port 8000",
      url: "http://localhost:8000/api/health",
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      command: "npm run preview -- --port 4173 --strictPort",
      url: "http://localhost:4173",
      reuseExistingServer: false,
      timeout: 30_000,
    },
  ],
});
