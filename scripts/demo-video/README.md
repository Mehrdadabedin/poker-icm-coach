# ICMBOT demo video (plans 067 and 082)

Makes `frontend/public/videos/ICMBOT_promo.mp4`, the narrated demo on the
landing pages: the landing page, sign in as `demoplayer`, choosing 8 bots, a
hand where the coach bets or raises and the size is picked with the size
buttons and Enter, a call where the coach folds, My Mistakes, Hand History,
the Report (summary, stack graph, mistake map, leaks, bet sizes), then the
end card (the video poster, no note). The poster `ICMBOT_video_poster.png`
is not changed.

The older `scripts/record-promo` made the previous video (old landing page,
Piper voice) and is not used by this pipeline.

## What each file does

| File | Job |
|---|---|
| `seed_history.py` | Gives `demoplayer` five saved tournaments, so Hand History and the Report have real numbers. |
| `record_demo.mjs` | Drives the local app with Playwright and records `TAKE_DIR/*.webm`, plus `marks.json` (a timestamp per step). |
| `demo_scenes.json` | The scenes (start and end as a mark name plus seconds), the narration lines, the voice and the end card. |
| `narrate.py` | Makes `lineNN.wav` per line with text-to-speech; only changed lines are requested again. |
| `endcard.mjs` | Renders the end card: the poster (a `note` in the scenes file would add a corner note). |
| `assemble.py` | Cuts the take into scenes, times each to its line (sped up to 2x, or holding the last frame), adds the end card, evens out the volume (-16 LUFS) and writes the MP4. |

## Run

1. Start the local PostgreSQL, give the demo account its history, and start
   a backend that saves history there but keeps accounts in memory:

   ```bash
   docker compose up -d postgres
   ```

   ```bash
   cd backend && uv run python ../scripts/demo-video/seed_history.py demoplayer
   ```

   ```bash
   cd backend && AUTH_STORAGE=file AUTH_USERS_FILE= AUTH_SESSIONS_FILE= HISTORY_DIR= HISTORY_STORAGE=database CORS_ORIGINS=http://localhost:5175 uv run uvicorn app.main:app --port 8766
   ```

   Start a fresh backend for each take: table labels count up per process,
   and the live table should be "Table A". Reseed if an earlier take left
   tables in the history.

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

   The script skips hands until the coach bets or raises and plays that hand
   with the coach, then finds a spot where the coach folds and calls instead,
   so My Mistakes has an entry. A full run takes about 1.5 minutes.

3. Voice. The key is read from `~/.config/icmbot/openrouter_key` (or
   `OPENROUTER_API_KEY`) and never printed. The voice is ElevenLabs v4
   "jessica" through OpenRouter ("sarah" also sounds good), a few cents for
   the whole script. Write the name as "ICM Bot" in the lines: written
   "ICMBOT", every voice says "ICM B-O-T".

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
