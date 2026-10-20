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
   the hand history now keeps with each decision. 5b (done): Hand History. 5c:
   Report. 5d: statistics, ICM calculator.
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
