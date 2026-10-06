# ICMBOT promo recorder (A48)

Reproduces the landing-promo video by driving the real app (backend + vite
dev) **only through the page's WebMCP tools** and encodes the result with
ffmpeg.

## Setup (once)

```bash
uv venv scripts/record-promo/.venv
uv pip install --python scripts/record-promo/.venv/bin/python imageio-ffmpeg
```

This installs a static ffmpeg (H.264 + WebP) that `record.mjs` locates
automatically. Override with `FFMPEG_BIN` if you prefer a system build.

## Run

```bash
cd frontend && npm run record:promo
```

The recorder:

1. starts `backend` (uvicorn :8000) and `vite dev` (:5173) when they are
   down;
2. creates a `Hero` demo account through `POST /api/auth/register` with a
   random password (stored only in the gitignored
   `scripts/record-promo/.venv/hero-credentials.json`; re-runs reuse it).
   An account left over from something else blocks the run — see the error
   message; it is never a committed credential;
3. injects a stand-in `document.modelContext.registerTool` before the app
   loads, collects the WebMCP tools on `window.__webmcp`, and drives the
   table with `get_game_state` / `fold` / `check` / `call` / `bet` /
   `all_in` / `next_hand` / `show_hand_result`, following the coach panel
   recommendation each turn;
4. records 1920x1080 (Playwright webm) with the scenes: landing hero ->
   TRY ONE SPOT reveal -> sign-in -> choose opponents -> 4 hands with the
   coach panel and the moving dealer button -> hand review + sidebar
   performance -> champion screen (dev-only `?testWinner=true&
   testWinnerName=Hero`);
5. encodes `frontend/public/videos/ICMBOT_promo.mp4` (H.264, <10 MB, one
   burned-in caption per scene) and `ICMBOT_promo_poster.webp`, prints the
   duration and file size.

The cookie banner never appears: the analytics consent is preset to denied
in localStorage before the app loads (no banner clicks).

No audio is mixed in (no music; the optional piper-tts voice-over is not
installed). Fonts for the drawtext captions come from the system
(fonts-dejavu-core) or `FONT_FILE`.
