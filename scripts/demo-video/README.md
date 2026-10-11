# ICMBOT demo video (plan 067)

Makes `frontend/public/videos/ICMBOT_promo.mp4`, the narrated demo on the
landing pages: minimal landing page, sign in as `demoplayer`, the menu,
Tournament settings, choosing 8 bots, one hand that follows the coach,
HOME and Continue table, one hand against the coach, My Mistakes, back to
the table, the ICM calculator, then the end card (the video poster). The
poster `ICMBOT_video_poster.png` is not changed.

The older `scripts/record-promo` made the previous video (old landing page,
Piper voice) and is not used by this pipeline.

## What each file does

| File | Job |
|---|---|
| `record_demo.mjs` | Drives the local app with Playwright and records `TAKE_DIR/*.webm`, plus `marks.json` (a timestamp per step). |
| `demo_scenes.json` | The scenes (start and end as a mark name plus seconds), the narration lines, the voice and the end card. |
| `narrate.py` | Makes `lineNN.wav` per line with text-to-speech; only changed lines are requested again. |
| `endcard.mjs` | Renders the end card: the poster plus the "AI-generated voice" note. |
| `assemble.py` | Cuts the take into scenes, times each to its line (sped up to 2x, or holding the last frame), adds the end card, evens out the volume (-16 LUFS) and writes the MP4. |

## Run

1. Start a local backend that keeps nothing on disk, and the dev site:

   ```bash
   cd backend && AUTH_STORAGE=file AUTH_USERS_FILE= AUTH_SESSIONS_FILE= HISTORY_DIR= CORS_ORIGINS=http://localhost:5175 uv run uvicorn app.main:app --port 8766
   ```

   ```bash
   cd frontend && VITE_API_URL=http://localhost:8766 npx vite --port 5175 --strictPort
   ```

2. Record (from the repo root). The password file holds a random password
   for the local `demoplayer` account; it is created on first use and never
   committed:

   ```bash
   python3 -c "import secrets;print(secrets.token_urlsafe(18))" > /tmp/demoplayer.pass
   node scripts/demo-video/record_demo.mjs /tmp/take /tmp/demoplayer.pass
   ```

   The script skips hands the coach folds at once, plays one hand following
   the coach, and answers the first decision of the next hand against the
   coach so My Mistakes has an entry. A full run takes 1 to 2 minutes.

3. Voice. The key is read from `~/.config/icmbot/openrouter_key` (or
   `OPENROUTER_API_KEY`) and never printed. The voice is ElevenLabs
   "jessica" through OpenRouter, about 3 cents for the whole script:

   ```bash
   uv run python scripts/demo-video/narrate.py scripts/demo-video/demo_scenes.json /tmp/lines
   node scripts/demo-video/endcard.mjs scripts/demo-video/demo_scenes.json /tmp/lines/endcard.png
   ```

4. Assemble (imageio-ffmpeg brings an ffmpeg with H.264 and AAC):

   ```bash
   uv run --with imageio-ffmpeg python scripts/demo-video/assemble.py scripts/demo-video/demo_scenes.json /tmp/take /tmp/lines /tmp/ICMBOT_demo.mp4
   ```

   Without `/tmp/lines/*.wav` it makes a silent preview with estimated line
   lengths, which is useful before a key exists.

5. Watch it with sound, then copy it to
   `frontend/public/videos/ICMBOT_promo.mp4`.

## Changing the video

- New words: edit a `line` in `demo_scenes.json` and rerun steps 3 and 4.
- Different steps: change `record_demo.mjs`, record again, and point the
  scenes at the new mark names (they are printed while recording).
- OpenAI voices also work: set `"provider": "openai"` with an OpenAI model
  and voice; the key goes in `~/.config/icmbot/openai_key`.
