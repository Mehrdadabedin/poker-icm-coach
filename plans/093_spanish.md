---
id: 093
title: Spanish Site (icmbot.es)
phase: 7
status: in-progress
depends_on: []
test_file: frontend/tests/i18n.test.tsx
implementation_files: [frontend/src/i18n/lang.ts, frontend/src/i18n/I18n.tsx, frontend/src/i18n/translate.ts, frontend/src/i18n/messages/en.ts, frontend/src/i18n/messages/es.ts, frontend/src/components/LanguageMenu.tsx]
---

# Objective

The owner (20 Oct): ICMBOT in Spanish on icmbot.es, then Simplified Chinese
for mainland China ("just Spanish now"). Every sentence was written in
English inside the code: about 340 in the screens and 150 coach and report
sentences from the server.

# How it works

- `src/i18n/messages/en.ts` holds every key; `es.ts` must have the same keys
  and placeholders (TypeScript and tests/i18n.test.tsx check both).
- `useT()` gives the text in the current language.
- Language: `?lang=` (remembered), then the visitor's choice, then the domain,
  then the browser (a READY language only), then English.
- icmbot.es speaks Spanish from the start: each screen turns Spanish as it is
  translated. icmbot.one follows a Spanish browser only once Spanish is in
  READY, so nobody there meets a half-translated site.
- The language menu shows when there is a choice: on icmbot.es, with
  ?lang=es, and everywhere once Spanish is READY.

# Steps (one pull request each)

1. The language system and the sign-in screen (done, #77).
2. Landing page, footer, cookie banner (done).
3. The table (done in 3a: buttons, sizes, header and ☰ menu, info rows, seats,
   result, bust and standings screens, coach labels; numbers as 45.000 and
   2,5 BB). 3b: hand review and hand history (done). 3c: home menu, bot
   choice and the Google sign-in return page (done).
4. Coach texts: the server sends codes and details next to its sentences.
   4a (done): the coach's reason, action words, factor rows and the grade.
   4b (done): hand names, the bots' reasons and the action they faced.
5. 5a (done): the page header and My Mistakes, the coach's reason from a code
   the hand history now keeps with each decision. 5b (done): Hand History. 5c
   (done): Report. 5d (done): statistics, ICM calculator.
6. Spanish review by a native speaker who plays poker; Spanish READY.
7. icmbot.es on Render (custom domain, DNS at one.com, CORS_ORIGINS) (done).
8. The page head for icmbot.es: Spanish title, description and link preview,
   og:url https://icmbot.es (code done; Render setup below is the owner's).

# The page head on icmbot.es (step 8)

Link-preview crawlers (WhatsApp, Facebook, X) read the HTML and run no
JavaScript, so lang.ts cannot make a shared icmbot.es link preview in
Spanish. Render's redirect and rewrite rules match the path only, never the
host (render.com/docs/redirects-rewrites, read 20 Oct), so one static site
cannot serve two heads. hreflang alone does not help either: crawlers build
the preview from og: tags, not from hreflang.

So icmbot.es becomes a second Render static site from the same repo, built
with `VITE_SITE_LANG=es`. `src/i18n/siteMeta.ts` holds each site's head and
the Vite plugin in `vite.config.ts` rewrites index.html with it. The bundle
is the same on both sites; only the head differs. Both heads carry canonical
and hreflang links naming the other site. The build fails if index.html
loses a tag it must rewrite, or if VITE_SITE_LANG is not a language.

Owner steps in the Render dashboard (I cannot do these):

1. New, Static Site, repo Mehrdadabedin/poker-icm-coach, branch main.
   Copy Root Directory, Build Command and Publish Directory from
   poker-icm-coach-layout-test.
2. Environment: copy every variable of poker-icm-coach-layout-test
   (VITE_API_URL and any VITE_GA_MEASUREMENT_ID), then add
   `VITE_SITE_LANG` = `es`. Copy any Redirects/Rewrites and Headers rules
   too (the live site showed none on 20 Oct: unknown paths answer 404).
3. Deploy. On the new site's onrender.com address, View Source shows
   `<html lang="es">` and `og:url` https://icmbot.es/. The app there speaks
   English (only the icmbot.es host turns it Spanish); that is expected.
4. On poker-icm-coach-layout-test, Settings, Custom Domains: delete
   icmbot.es and www.icmbot.es. Add both to the new site.
5. DNS at one.com: the A record 216.24.57.1 stays. Point the www CNAME at
   the new site's onrender.com address. Wait for Render to show both
   domains verified and the certificate issued (icmbot.es is down from step
   4 until then, usually minutes).
6. No backend change: CORS_ORIGINS and Google sign-in already allow
   https://icmbot.es, and the origin does not change.
7. Refresh the previews: Facebook Sharing Debugger
   (developers.facebook.com/tools/debug), https://icmbot.es/, Scrape Again.
   WhatsApp keeps an old preview for a link it has seen; test with
   https://icmbot.es/?v=2.

Each push to main now builds both sites.

Later, Chinese: `zh.ts`, "zh" in LANGS, fonts served by us (Google Fonts is
blocked in mainland China and blocks the first paint).

# Checked

Step 1, browser with ?lang=es: the sign-in screen in Spanish, the menu
(English, Español) switches back to English and remembers it.

Step 2, browser with ?lang=es: the landing page in Spanish ("Domina tus
decisiones de torneo", the gold word kept), language pills in the footer.
The demo video still speaks English; a Spanish narration is a later step.

Step 3a, browser with ?lang=es on a local table: NO IR, IGUALAR 100, SUBIR A
250, 2,5x, STACK 45.000, NIVEL, MANO, COACH ICM, Detalles, TÚ. Poker words
follow the big Spanish poker sites: no ir, pasar, igualar, apostar, subir,
all-in, bote, ciegas. Street names stay preflop, flop, turn, river.

Step 3b, browser with ?lang=es after a hand: HISTORIAL DE LA MANO, HAS
PERDIDO, MANO GANADORA, PRESIÓN ICM BAJA, MANOS EN EL SHOWDOWN, pone la ciega
grande. Hand names ("Pair of Js") and the bots' reasons come from the server:
step 4.

Step 3c, browser with ?lang=es at 574 and 360 wide: the home menu (Empezar a
practicar, ESTUDIAR, Coach ICM, Seguir en la mesa D), EN / ES in its header,
the bot page (PERFILES DE BOTS, Tight agresivo, RIVALES 8 / 8), no sideways
scroll.

Step 4a, browser with ?lang=es on a local table (backend restarted): NO IR,
"5♥ 7♦ no está en el rango de apertura de CO.", every factor row in Spanish
(STACK 45.000 fichas (450,0 BB), FASE INICIAL, COBERTURA CUBRES AL RIVAL),
and after calling: "SUBÓPTIMA — IGUALAR se aparta de la jugada recomendada:
NO IR." A test reads backend/app/strategy/reasons.py: every code has Spanish,
and the English matches the server word for word.

Step 4b, tests only (I did not check it in the browser): hand names read back
from the server's one English form ("Pair of Ts" -> "Pareja de 10", "Full
House, Ks full of 2s" -> "Full de K con 2"); the bots' reasons and the action
faced from codes ("Iguala con Q♣ J♣: equity del 38% ... presión ICM muy alta
(rentable).", "Apuesta de 45.000", "12,5 BB"). A test reads
backend/app/services/bot_texts.py: every code has Spanish and the English
matches the server word for word.

Step 5a, tests only (I did not check it in the browser): MIS ERRORES, "2
errores en 3 decisiones a lo largo de 2 manos", Igualada errónea, Nivel 2,
ICM MUY ALTA, Stack 12,5 BB · 45.000 para igualar, Tú: IGUALAR → Coach: NO
IR, and the coach's reason in Spanish from the saved code; a hand saved
before the codes shows its English reason. Header: VOLVER A LA MESA, INICIO,
CERRAR SESIÓN.

Step 5b, tests only (I did not check it in the browser): HISTORIAL DE
MANOS, "Mesa A · terminado 5.º · 1 mano", "2 manos terminadas", NIVEL 1
(ciegas 100/200), Valoración, rows with 45.000, +12.000, Tú, Asiento 5,
IGUALAR, NO IR, SUBÓPTIMA, and the filters. The Report's tournament list
uses the same names, so it is Spanish too.

Step 5c, tests only (I did not check it in the browser): INFORME, Últimos
30 días, "1209 manos, 15.000 decisiones valoradas por el coach", Puesto
medio 4,5, 72,7%, "▲ 6,7 frente a los 30 días anteriores", GRÁFICO DE
STACK · MESA C, 12 OCT, N2 on the bands, the leak "BB, preflop: IGUALAR
cuando el coach dice NO IR", VPIP (jugar la mano) por encima del rango, and
the bet-size bars and lines. English is unchanged (the existing Report
tests pass untouched).

Step 5d, tests only (I did not check it in the browser): CALCULADORA ICM,
Premio total (EUR), Puesto 1, Añadir jugador, results as 47,37% / 376,60
EUR / -9,71%, the form errors in Spanish; ESTADÍSTICAS DE LA SESIÓN with
25,5%, 12.500, 1,50, +45.000. Step 5 is done: every screen a player sees
is now in Spanish on icmbot.es. Left for Spanish: the native review (6) and
the domain (7). The admin pages stay English (only the owner uses them).

Step 7, checked from outside on 20 Oct (the owner set it up the same day):
icmbot.es A 216.24.57.1 and www.icmbot.es CNAME to the Render static site,
as for icmbot.one; https://icmbot.es serves 200 with a Let's Encrypt
certificate for icmbot.es (to 18 Jan 2027), http and www redirect to
https://icmbot.es. The backend's CORS_ORIGINS on Render allows
https://icmbot.es and https://www.icmbot.es (a preflight from another site
gets 400), and Google sign-in starts from icmbot.es (302 to Google; another
site gets 400). The live bundle has the step 5 Spanish. Not done: the page
still says lang="en" and og:url https://icmbot.one before the app starts,
so a shared icmbot.es link previews in English.
