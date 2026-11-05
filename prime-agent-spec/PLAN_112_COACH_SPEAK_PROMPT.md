# Prime-Agent Prompt: plan 112, Coach Speak

You are working in the ICMBOT repository. Read `CLAUDE.md` first and follow it.
Then read `plans/112_coach_speak.md` on `main`. Build it only after the owner
has approved the plan and answered its "Open for the owner" list; use their
answers where they differ from the plan. Build PRs 1 and 2. Build PR 3 and PR 4
only if the owner asked for them, and only the parts they picked.

## Where to work

```
cd /home/mehrdad/Projects/poker-icm-coach
git fetch origin
git worktree add ../poker-icm-coach-voice origin/main -b feat/coach-voice-web
ln -s /home/mehrdad/Projects/poker-icm-coach/frontend/node_modules ../poker-icm-coach-voice/frontend/node_modules
```

Other sessions use the main checkout and its sibling worktrees: never switch
their branches. Never commit the `node_modules` link; add files by name. Every
command under `timeout 300` (`timeout 900` for full test runs).

One branch per PR, each from `origin/main` after the one before is merged:
`feat/coach-voice-web`, `feat/coach-voice-android`, then if asked
`feat/coach-voice-more`, `feat/coach-raise-size`.

## What exists today (read these first)

- `hooks/useTableCoach.ts`: asks for advice when `waitingForHero`,
  `handNumber`, `phase`, `street` or `actionLog.length` moves; `coach` is
  `null` between the hero's turns; no request for Free.
- `components/LiveTableView.tsx` (145 lines): `coachNow`, the advice for this
  street during the hero's turn only. Feeds `TableSidebar` > `CoachPanelView`
  (wide), `CoachStrip` and `CoachSheet` (upright phone), `MobileCoachCard`
  (landscape, narrow).
- `components/TableChips.tsx` (38 lines): the chips at the end of the first
  status line, in every layout. The speaker chip goes here.
- `i18n/coach.ts` (`actionWord`, `coachReason`), `i18n/lang.ts`
  (`numberLocale()`: `en-US`, `es-ES`), `i18n/messages/en.ts` and `es.ts` join
  one file per area; `tests/i18n.test.tsx` checks both have the same keys.
- `hooks/useStoredFlag.ts`, `services/plan.ts` (`usePlan`, `useIsFree`),
  `services/platform.ts` (`inAndroidApp()`), the dynamic plugin imports in
  `services/appGoogle.ts` and `components/AppLinkListener.tsx`.
- The advice has no amount (`CoachAdvice` in `models/game.ts`). The call
  amount is `state.toCall`.
- The frontend polls every 350 ms (CLAUDE.md), so a snapshot often repeats.
- 200 lines max per `.ts`/`.tsx`; no em dashes; no `any`, no `console.*`.

## PR 1: speech on the web (`feat/coach-voice-web`)

1. `services/speech.ts`: `speechAvailable()`, `speak(text, lang)` (cancel,
   then speak; `utterance.lang`, the first local voice for the language, rate
   1.05), `stopSpeaking()`. Web engine only in this PR. No new dependency.
2. `i18n/messages/en/speak.ts` and `es/speak.ts`, joined in `en.ts` and
   `es.ts`: the spoken action words from the plan's table, `speak.call`
   ("Call {amount}." / "Igualar {amount}."), `speak.on` ("Coach voice on." /
   "Voz del coach activada."), the chip's name and title.
3. `models/coachSpeech.ts`: pure `spokenAdvice(coach, state, t)` and
   `decisionKey(state)` (`handNumber:street:actionLog.length`).
4. `hooks/useCoachSpeech.ts`: `useCoachSpeech(coachNow, state, on)`. Speaks
   once per new key, stops when `coachNow` turns `null`, when `on` turns
   false, on `visibilitychange` to hidden and on unmount. Returns `stop` for
   `onAction` to call.
5. `components/SpeakerChip.tsx`: the round chip, `aria-pressed`, fixed name
   "Coach voice" / "Voz del coach", icon `aria-hidden`; turning it on speaks
   `speak.on` inside the click (the iOS unlock). After a reload with "on"
   saved, the first `pointerdown` on the table speaks an empty sentence once.
   Hidden for Free, while the plan loads, and when `speechAvailable()` is
   false. `useStoredFlag("icmbot.coachVoice", false)`.
6. `TableChips` renders the chip first; `LiveTableView` calls the hook and
   wraps `onAction` so acting stops the voice. Keep both under 200 lines.
7. The chip's CSS in both themes, with the theme tokens (plan 103).

Tests: `tests/coach_speech_text.test.ts` (every action word in en and es, the
call amount, `CALL JAM` over the stack, an unknown word) and
`tests/coach_speech.test.tsx` with a fake `window.speechSynthesis` (records
utterances, counts `cancel`): one utterance for 10 identical polls, a second
after a new street and after a re-raise on the same street; `cancel` on Call,
hand end, page hidden, chip off; off by default; Free and no support give no
chip; `aria-pressed` flips and "Coach voice on" is spoken; `?lang=es` gives
`es-ES` and "Voz del coach".

Check it: Chrome desktop and Chrome on an Android phone (the browser, not the
app), English and Spanish; and iOS Safari if a device is available, else say
you did not check it. Screenshots of the chip on and off at 390 px and
1280 px, dark and light.

## PR 2: the Android app (`feat/coach-voice-android`)

1. `npm install @capacitor-community/text-to-speech@8.0.2` in `frontend/`.
   Justify the dependency in the commit message: the Android web view has no
   `speechSynthesis` (MDN `webview_android: false`).
2. `npx cap sync android`. Commit only the generated Gradle and plugin files
   that sync changes, by name.
3. `services/speech.ts`: in the app (`inAndroidApp()`) and when
   `Capacitor.isPluginAvailable("TextToSpeech")`, speak with the plugin
   (`TextToSpeech.speak({ text, lang, rate })`, `TextToSpeech.stop()`),
   loaded with `import()`. An older app without the plugin: `speechAvailable()`
   false, no chip.
4. Tests: a mocked plugin is used in the app; a missing plugin hides the chip.
5. Build the debug APK as in `plans/083_android_app.md`. Install it on a phone
   and check English and Spanish, the strip folded and open, and that the voice
   stops when the app goes to the background. Ask the owner to do the phone
   check if you cannot.

## PR 3 (only if asked): more to hear (`feat/coach-voice-more`)

Only the ideas the owner picked from the plan's list. "Say the reason too"
builds the sentence from `reasonCode` and `reasonParams` with new
`speak.reason.*` keys (spoken hand, position and percent), never by rewriting
the panel text. If plan 111 is on `main`, reuse its position words in
`a11y.ts`, and make its announcer leave out "Coach: ..." while the voice is on.

## PR 4 (only if asked): the raise size (`feat/coach-raise-size`)

`advice_dict` in `backend/app/services/session_coach.py` adds
`recommendedAmount`: the "raise to" total for this street, from the size
`action_risk` in `backend/app/strategy/coach_ev.py` assumes, preflop raises
only, else `null`. Backend tests for open, facing a raise, 3-bet and a short
stack capped at the stack. The panel shows "RAISE TO 250"; the voice says
"Raise to 250." / "Subir a 250.".

## Git

- `npm run lint`, the full `npx vitest run` and all pre-push gates pass;
  backend suite too for PR 4.
- Plan 112 `in-progress` while you work, `complete` after PR 2 (or the last
  PR asked for), with its `progress.md` row and test counts.
- Push and open each PR to `main` with "## What changed" and "## Tests". Do
  not merge.

Report: what you built, the test counts before and after, which devices and
languages you listened on, the screenshot paths, and anything you did not
check.
