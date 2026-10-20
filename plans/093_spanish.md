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
   2,5 BB). 3b: hand review and hand history (done). 3c: home menu and bot
   choice.
4. Coach texts: the server sends codes and details instead of sentences.
5. My Mistakes, Hand History, Report, statistics, ICM calculator.
6. Spanish review by a native speaker who plays poker; Spanish READY.
7. icmbot.es on Render (custom domain, DNS at one.com, CORS_ORIGINS).

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
