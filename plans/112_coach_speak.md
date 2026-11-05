---
id: 112
title: Coach Speak, the Coach Says Its Advice Aloud
phase: 8
status: planned
depends_on: [093, 100, 101, 106]
test_file: frontend/tests/coach_speech.test.tsx
implementation_files: [frontend/src/services/speech.ts, frontend/src/models/coachSpeech.ts, frontend/src/hooks/useCoachSpeech.ts, frontend/src/components/SpeakerChip.tsx, frontend/src/components/TableChips.tsx, frontend/src/components/LiveTableView.tsx, frontend/src/pages/SettingsPage.tsx, frontend/src/styles/table-chips-speak.css, frontend/src/i18n/messages/en/speak.ts, frontend/src/i18n/messages/es/speak.ts, frontend/src/i18n/messages/en.ts, frontend/src/i18n/messages/es.ts, frontend/package.json, frontend/android/app/capacitor.build.gradle, frontend/android/capacitor.settings.gradle]
---

# Objective

The owner (5 Nov): a speaker icon on the ICM coach, so the coach says "Fold", "Call 1,200" or "Raise"
aloud and the player can decide without looking at the coach panel. This plan sizes and designs it.

No code is written until the owner approves this plan.

# Size

**Medium overall: 2 PRs for the feature, 2 optional PRs after it.**

| PR | What | Size |
|---|---|---|
| 1 | Speech in the browser (desktop, phone browsers, iOS Safari), the speaker chip, once per decision, English and Spanish | Small to medium, about 400 lines with tests |
| 2 | The Android app: a native text-to-speech plugin, a new APK | Small, but needs an APK build and a real phone |
| 3 (optional) | Say the reason too, the hand result, a sound on your turn, the grade | Small to medium |
| 4 (optional) | "Raise to 250": the coach sends the raise size it already assumes | Small, backend and panel |

PR 1 alone works everywhere except the Android app, where the chip stays hidden.

# What is there today

Audit of `frontend/src` on `main` at 762547f.

- **Where the advice comes from.** `hooks/useTableCoach.ts` calls `coachAdvice(tableId)` when
  `state.waitingForHero` turns true, and again when `handNumber`, `phase`, `street` or the length of
  `actionLog` changes. The 350 ms poll (`useGame`) repeats the same snapshot many times, but the advice
  request only runs when one of those values moves. Between the hero's turns `coach` is set to `null`.
- **Which advice is current.** `LiveTableView.tsx` computes `coachNow`: the advice, only during the
  hero's turn, not while an action is being sent, not after the hand, and only for this street. Older
  advice never shows.
- **Where it is shown.** One `coachNow` feeds every layout:
  - wide screens: `TableSidebar` > `CoachPanelView` (`coach-panel`, with HIDE and SHOW);
  - upright phone: `CoachStrip` on top of the felt, `CoachSheet` on a tap (plan 101);
  - phone landscape and narrow windows: `MobileCoachCard` (plan 087);
  - the hand review reuses `CoachPanelView` after the hand.
- **The status line chips.** `TableChips.tsx` (i, History, and the folded Coach chip) sits at the end
  of the first status line in every layout since plan 106. It is the one place every layout shares.
- **What the advice holds.** `recommendedAction` ("FOLD", "CALL", "RAISE", "OPEN JAM", "3-BET" and
  others), `street`, `reasoning` plus `reasonCode` and `reasonParams` (plan 093), and the factor rows.
  **It has no amount.** The coach decides an action, not a size. The client knows the amount to call
  (`state.toCall`) and the hero's stack. For raises the coach's EV maths assumes a size
  (`backend/app/strategy/coach_ev.py`, `action_risk`: 2.5 BB to open, 2 BB plus the call when facing a
  bet, 3 times for a 3-bet) but does not send it.
- **Words.** `actionWord` and `coachReason` in `i18n/coach.ts` give the action and the reason in the
  page language. Reasons use shorthand ("83o", "CO", "~42%") that reads well but sounds bad aloud.
- **Free and Pro.** The coach is Pro only (plan 100). `useTableCoach` sends no request for Free, so
  `coachNow` is always `null` there.
- **Choices kept on the device.** `hooks/useStoredFlag.ts` (`icmbot.coachStrip`,
  `icmbot.tableDetails`) and `services/theme.ts` (`icmbot.theme`). Server settings
  (`/api/settings`, `services/preferences.ts`) hold the game setup and the label choices.
- **The Android app** (`capacitor.config.ts`) shows the live site in a web view and already loads
  Capacitor plugins from the site with `import("@capacitor/browser")` and `import("@capacitor/app")`.
  `services/platform.ts` has `inAndroidApp()`.

# Approach: the device's own voice

## Options

| | Device voice (Web Speech API, `speechSynthesis`) | Server text-to-speech (a cloud voice) | Recorded clips |
|---|---|---|---|
| Cost | Free | Paid per character, every decision of every Pro player | Free after recording |
| Delay | About 0.1 s, on the device | A network round trip on top of the advice request | None |
| Works offline | Yes, with local voices | No | Yes |
| Numbers ("Call 1,200") | Yes | Yes | No, only fixed words |
| The reason | Yes | Yes | No |
| Voice quality | Depends on the device; good on iOS, Android and Windows | Best | Best |
| New code | Frontend only | New route, a provider key, a rate limit, caching | 20 to 30 files per language |

**Chosen: the device voice.** It is free, adds no backend work and no running cost, says numbers and
reasons, and has English and Spanish voices on every current phone and computer. Server voices would
add a bill that grows with every Pro player, for a better voice the owner did not ask for. Clips cannot
say amounts or reasons.

## Where the device voice works

Checked against MDN's browser data (`api.SpeechSynthesis`, 5 Nov) and the plugin's npm page.

- **Desktop Chrome, Edge, Firefox, Safari; Chrome on Android; Safari on iOS:** yes.
- **The Android app: no.** The Android System WebView has no `speechSynthesis` (MDN:
  `webview_android: false`, Chromium bug 40417848). The app needs the native plugin
  `@capacitor-community/text-to-speech` 8.0.2 (MIT, for Capacitor 8, the app uses 8.5). It speaks with
  Android's own text-to-speech engine and has the same calls on iOS and the web.
- **iOS Safari needs a tap first.** Speech only starts after one `speak()` inside a tap. Turning the
  speaker on is that tap: it says "Coach voice on". After a reload the saved "on" needs one more tap,
  so the first tap anywhere on the table (a button, the felt) speaks an empty sentence once to unlock.
- **Chrome loads its voices late.** `getVoices()` is empty until the `voiceschanged` event. The voice
  is chosen when the first sentence is spoken, not at page load.

## One small module, two engines

`services/speech.ts` exports `speechAvailable()`, `speak(text, lang)` and `stopSpeaking()`:

- in the Android app (`inAndroidApp()`): the plugin, loaded with `import()` like `@capacitor/browser`.
  An app built before PR 2 has no plugin (`Capacitor.isPluginAvailable("TextToSpeech")` is false), so
  `speechAvailable()` is false and the chip stays hidden;
- everywhere else: `window.speechSynthesis` and `SpeechSynthesisUtterance`, no new dependency.

`speak` cancels anything still being said, then speaks. Language: `en-US` or `es-ES`, the same as
`numberLocale()`. Voice: the first local voice for that language, else the engine's default for
`utterance.lang`. Rate 1.05, so "Call 1,200" takes under a second.

# Design

## The speaker chip

- One round chip in `TableChips`, before i and History, in every layout: wide screens, upright phone,
  landscape. One place to learn, and the chips row already fits 360 px (plan 106).
- Icon: a speaker with sound waves when on, a speaker with a cross when off. Same size and style as the
  other chips.
- `aria-pressed` true or false. A fixed name, "Coach voice" / "Voz del coach", so the name does not
  change with the state (the state is in `aria-pressed`). `title` adds "on" or "off".
- Hidden for Free (the coach is Pro only), hidden while the plan is loading, hidden when
  `speechAvailable()` is false.
- The voice works with the phone strip folded. A player may fold the strip and listen only, which is
  the point of the feature.

## Kept on the device, not on the account

`useStoredFlag("icmbot.coachVoice", false)`. Off by default. Why not `/api/settings`: the voice belongs
to the device (headphones on the phone, not on the work laptop), iOS needs a tap per device anyway, and
the strip and theme choices already live on the device. No backend change.

## Once per decision

- `useCoachSpeech(coachNow, state, on)`, called once in `LiveTableView`.
- The decision key is `handNumber:street:actionLog.length`, the same values that make
  `useTableCoach` ask again. A ref keeps the last spoken key. The 350 ms poll repeats the snapshot and
  the key with it, so nothing is said twice.
- It speaks when `coachNow` is not `null` and its key differs from the last spoken one. Advice that
  arrives late is spoken when it arrives, still only while it is the hero's turn.
- Stops (`stopSpeaking()`) when: the hero acts (button or key, both go through `onAction`), `coachNow`
  becomes `null` (turn over, hand over), the chip is turned off, the page is hidden
  (`visibilitychange`), the table unmounts.
- Turning the chip on during the hero's turn says the current advice at once.

## What is said

A pure function, `spokenAdvice(coach, state, t)` in `models/coachSpeech.ts`, with its own keys in
`i18n/messages/{en,es}/speak.ts`. Spoken words are separate from the panel words: the panel shows
capitals ("OPEN JAM"), and some voices spell capitals letter by letter.

| Advice | English | Spanish |
|---|---|---|
| FOLD | Fold. | No ir. |
| CHECK | Check. | Pasar. |
| CALL, CALL JAM | Call 1,200. | Igualar 1.200. |
| BET | Bet. | Apostar. |
| RAISE, OPEN RAISE | Raise. | Subir. |
| 3-BET, 4-BET | Three-bet. / Four-bet. | Resubir. |
| OPEN JAM, RESHOVE, ALL-IN | All-in. | All-in. |

- The call amount is `state.toCall` (`CALL JAM`: the smaller of `toCall` and the hero's stack),
  grouped in the page language so the voice reads "twelve hundred" or "mil doscientos".
- Unknown action words (a newer server) are said as `actionWord` gives them, in lower case.
- With PR 4: "Raise to 250." / "Subir a 250."

# Steps (one PR each)

1. **Speech on the web.** `services/speech.ts` (web engine only), `models/coachSpeech.ts`,
   `hooks/useCoachSpeech.ts`, `components/SpeakerChip.tsx` in `TableChips`, one line in
   `LiveTableView`, `speak.ts` (en, es), the chip's CSS in both themes, the iOS unlock tap.
2. **The Android app.** Add `@capacitor-community/text-to-speech` 8.0.2 (justified in the commit:
   the web view has no speech), `npx cap sync android`, the native engine in `services/speech.ts`,
   `speechAvailable()` false on an older app. Build the APK and check on a phone in English and
   Spanish.
3. **(Optional) More to hear.** Settings gets a COACH VOICE group: "Say the reason too" (off by
   default) and the speed (normal, fast). The spoken reason uses spoken words, not shorthand: "83o" is
   "eight three offsuit", "CO" is "cutoff", "~42%" is "about 42 percent", built from `reasonParams`
   with new `speak.reason.*` keys, never by rewriting the panel text. Plus the extra ideas below that
   the owner picks.
4. **(Optional) The raise size.** The server adds `recommendedAmount` (the "raise to" total for this
   street) to the advice, from the size `action_risk` already assumes, preflop only. The panel shows
   "RAISE TO 250" and the voice says it. Postflop bets have no assumed size today, so they stay "Bet."

Every file stays at 200 lines or fewer (hard rule 6). `LiveTableView.tsx` is 145 lines and gains 2;
`TableChips.tsx` is 38 and gains 2 (the chip is its own component). No `any`, no `console.*`.

# Tests

New `frontend/tests/coach_speech.test.tsx` and `coach_speech_text.test.ts`. jsdom has no
`speechSynthesis`, so a test helper installs a fake on `window`: `speak` records each utterance's
`text`, `lang` and `rate`; `cancel` counts calls; `getVoices` returns an English and a Spanish voice.

- **Text:** `spokenAdvice` for every action word in English and Spanish; "Call 1,200" and
  "Igualar 1.200"; `CALL JAM` larger than the stack says the stack; an unknown word is said as sent.
- **Once per decision:** render the table, feed the same snapshot 10 times (the poll): one utterance.
  A new street, or the same street after a re-raise (`actionLog` longer): a second one.
- **Stops:** the hero clicks Call: `cancel` is called. The hand ends, the page is hidden, the chip is
  turned off: `cancel` each time.
- **Off and Free:** off by default, no utterance. Free: no chip, no utterance. No speech support
  (the fake removed): no chip.
- **The chip:** `getByRole("button", { name: "Coach voice" })` has `aria-pressed="false"`, then
  `"true"` after a click, and the click speaks "Coach voice on" (the iOS unlock). The choice survives a
  re-render (localStorage). The same with `?lang=es`, "Voz del coach", `lang` `es-ES`.
- **Android (PR 2):** a mocked plugin is used when `inAndroidApp()` is true; when the plugin is
  missing, no chip.
- English and Spanish have the same keys (the existing `i18n.test.tsx`).
- Reverting each fix makes its test fail with a message naming the cause (repo rule). Both suites
  stay green, and the counts go in `progress.md`.

# Overlap with plan 111 (screen-reader names and live updates)

Plan 111 (on `main` since PR #128, not built yet) adds a `TableAnnouncer` whose assertive
message on the hero's turn ends with "Coach: Raise" for Pro. A screen-reader player with Coach Speak on
would hear the advice twice, in two voices at once.

- Whichever lands second adds the rule: **when Coach Speak is on, the announcer leaves out the coach
  part** (`announcementsFor(..., { coach: coachNow && !voiceOn })`).
- Plan 111 removes `role="status"` from `CoachStrip` and `MobileCoachCard`. Coach Speak does not need
  it either and does not add it back.
- Plan 111's `a11y.ts` spells out positions ("hijack", "cutoff"). PR 3's spoken reason reuses those
  keys when 111 is on `main`, and adds them in `speak.ts` only if it is not.
- The speaker chip follows plan 111's rules: visible text or a fixed `aria-label`, an `aria-hidden`
  icon, no live region.

# More ideas, for the owner to pick (PR 3)

- **A sound on your turn.** A short soft tone when it becomes the hero's turn, made with Web Audio (no
  sound file). Useful for Free players too, since it is not coach advice. Its own chip or setting.
- **The grade, aloud.** After the hero acts, the grade the strip already shows: "Good." / "Mistake,
  the coach said fold."
- **The hand result.** Once per hand: "You won 3,400." / "Has ganado 3.400."
- **Say it again.** The V key on a computer, or a long press on the chip on a phone, repeats the last
  advice.
- **The Coach page and the quiz.** The same voice on the hand analyser (`CoachPage`) and on the quiz
  answer (plan 110). Small once PR 1 exists.

# Not in this plan

- Server text-to-speech and recorded voices (see Options).
- Voice input ("fold" said by the player). Hard to get right in a noisy room and outside the ask.
- Choosing a voice from a list. The device's language default is used; a picker can come later.
- The iOS app (there is none; iOS Safari is covered).
- The admin pages and the hand review: speech is for the live table only.

# Open for the owner

- Raise size (PR 4): say "Raise to 250" using the size the coach's EV maths already assumes, or keep
  "Raise." The coach does not choose sizes today, so PR 4 makes that assumed size visible advice.
- Free players: no chip (as written), or a locked chip that opens the Upgrade sheet (plan 100).
- Off by default (as written), or on for new Pro players.
- Which PR 3 ideas, if any.

# Not verified

- How each phone's voice says "3-BET", "all-in" and amounts in Spanish. PR 1 and 2 need a listen on a
  real iPhone and Android phone, English and Spanish, before they are called complete.
- Whether iOS mutes `speechSynthesis` with the ring/silent switch. If it does, the chip's title should
  say so.
- How the plugin behaves when the app goes to the background mid-sentence.
