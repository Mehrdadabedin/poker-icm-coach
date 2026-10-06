# ICMBOT promo recorder (A48)

Reproduces the landing-promo video by driving the real app (backend + vite
dev) **only through the page's WebMCP tools** and encodes the result with
ffmpeg.

## Setup (once)

```bash
uv venv scripts/record-promo/.venv
uv pip install --python scripts/record-promo/.venv/bin/python imageio-ffmpeg piper-tts
```

Installs the static ffmpeg (H.264 + WebP) and piper-tts; `record.mjs`
locates both automatically (override with `FFMPEG_BIN`). The female
narration voice `en_US-hfc_female-medium` (fallback `en_US-amy-medium`,
never male) downloads on first run into `.venv/voices/`.

## Narration

Edit `scripts/record-promo/narration.json` to change the script; the lines
there are the captions AND the audio. Each scene is held open at least as
long as its line (+0.5s), the audio is loudness-normalised to about -16
LUFS (AAC 128 kbps), and every re-record re-synthesizes the WAVs with
piper.

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
   burned-in caption per scene tied to its scene mark, AAC 128 kbps
   loudnorm -16 LUFS narration) and `ICMBOT_promo_poster.webp`, and prints
   the duration, file size and used voice.

The cookie banner never appears: the analytics consent is preset to denied
in localStorage before the app loads (no banner clicks).

There is no music. The captions come from the narration lines rendered by
Playwright as transparent PNGs and composited with the overlay filter; the
audio is the per-scene piper WAVs (adelay onto the scene marks, amix,
loudnorm).
