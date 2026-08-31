---
id: 042
title: GitHub Pages Deployment
phase: 5
status: in-progress
depends_on: [37, 38]
test_file: .github/workflows/deploy-pages.yml
implementation_files: [.github/workflows/deploy-pages.yml, frontend/dist]
---

# Objective

Publish the production frontend (frontend/dist) to GitHub Pages for
https://mehrdadabedin.github.io/poker-icm-coach/ using a dedicated GitHub
Actions workflow. The existing CI workflow is preserved untouched.

# Requirements

- Trigger on push to main.
- Checkout, setup Node 22, npm ci, `npm run build -- --base=/poker-icm-coach/`.
- Upload ONLY frontend/dist and deploy with the official Pages actions
  (configure-pages, upload-pages-artifact, deploy-pages).
- permissions: contents: read, pages: write, id-token: write.
- environment: github-pages (url bound to deploy output).
- Vite base path handles the /poker-icm-coach/ subpath; hash routing
  (HashRouter) is preserved; local dev URL (localhost:5173) unaffected.

# Dependencies

Part 037 (baseline), 038 (ICM Master rename).

# Tests

- Local `npm run build` still succeeds and /assets/ refs unchanged (dev URL intact).
- `npm run build -- --base=/poker-icm-coach/` emits /poker-icm-coach/assets/ refs.
- Workflow YAML parses; permissions/env/steps verified.
- Deployment run status verified via GitHub Actions API.

# Implementation

.github/workflows/deploy-pages.yml (new file). No application code changes.

# Acceptance Criteria

GitHub Actions "Deploy to GitHub Pages" completes; site serves at the subpath.

# Notes

Static hosting only: the practice table needs the FastAPI backend, which
GitHub Pages cannot host; set VITE_API_URL at build time once a backend URL
exists. Pages Source must be set to "GitHub Actions" in repo settings.
