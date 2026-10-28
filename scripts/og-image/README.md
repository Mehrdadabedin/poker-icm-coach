# Link preview and landing hero pictures (plan 104)

Makes four pictures from the real app, so they can be rebuilt after a design change:

| File in `frontend/public/images/` | What | Used by |
|---|---|---|
| `og-app-1200x630.jpg`, `og-app-1200x630-es.jpg` | link preview card, 1200 x 630 JPEG | `index.html`, `i18n/siteMeta.ts` (icmbot.one, icmbot.es) |
| `hero-app.webp`, `hero-app-es.webp` | landing hero, 1602 x 982 WebP, under 250 KB | `landing-minimal/MinimalHero.tsx` |

## Files

| File | Job |
|---|---|
| `capture.mjs` | Signs in as a Pro test user, starts a table with 8 bots, folds until the coach says RAISE or CALL with 9 seats, and screenshots a phone (390 x 844, 2x) and a wide screen (1600 x 1000, 2x), in English and Spanish (`?lang=es`). Dark theme. |
| `render.mjs` | Lays the screenshots into `preview.html` (card) and `hero.html` (laptop and phone) and writes the four pictures. WebP comes from the browser's own encoder (no image library). |
| `preview.html`, `hero.html`, `card.css`, `strings.js` | The layouts, the dark colours of `tokens.css`, and the card text per language. |

## Run

Start a backend and the app (a new account is Free, so `capture.mjs` makes the
test user Pro through the admin API; `adminuser` must be an admin):

```bash
cd backend && AUTH_STORAGE=file AUTH_USERS_FILE= AUTH_SESSIONS_FILE= HISTORY_DIR= HISTORY_STORAGE=off ADMIN_USERNAMES=adminuser CORS_ORIGINS=http://localhost:5193 uv run uvicorn app.main:app --port 8793
cd frontend && VITE_API_URL=http://localhost:8793 npx vite --port 5193 --strictPort
```

Then, from the repo root. The password file holds the local `adminuser`
password (never committed); the test user's password is derived from it.

```bash
node scripts/og-image/capture.mjs /tmp/og/shots /tmp/demoplayer.pass
node scripts/og-image/render.mjs /tmp/og/shots /tmp/og/check
```

`SITE` and `API` change the two addresses. Without the second argument,
`render.mjs` writes only the four pictures.

## Check it by eye

`render.mjs` with a check folder also writes, per language:

- `og-app-500.png`: the card at 500 px wide, how it shows in a chat;
- `og-app-crop-300.png`: the centre 630 x 630 square of the card at 300 px.
  WhatsApp's small preview shows only this square. The logo and the phone
  (coach strip saying RAISE or CALL, 9 seats, action buttons) must be whole
  in it; the headline and the three lines sit outside it and may be cut;
- `hero-app-500.png`: the hero at 500 px wide.

The wide screenshot is 1600 x 1000, not 1280 x 800: the Spanish side panels
overflow a 1280 px page (a bug in the app, not fixed here).
