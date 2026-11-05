---
id: 113
title: Simplified Chinese and Persian
phase: 8
status: planned
depends_on: [093, 111]
test_file: frontend/tests/i18n.test.tsx
implementation_files: [frontend/src/i18n/lang.ts, frontend/src/i18n/I18n.tsx, frontend/src/i18n/translate.ts, frontend/src/i18n/siteMeta.ts, frontend/src/i18n/messages/zh.ts, frontend/src/i18n/messages/fa.ts, frontend/src/components/LanguageMenu.tsx, frontend/src/styles/lang-menu.css, frontend/src/landing-minimal/MinimalLanguages.tsx, frontend/src/landing-minimal/MinimalFooter.tsx, frontend/src/pages/MinimalLandingPage.tsx, frontend/src/styles/base.css, frontend/vite.config.ts, frontend/tests/i18n.test.tsx, frontend/tests/i18n_rtl.test.tsx, scripts/table-fit/check.mjs]
---

# Objective

The owner (5 Nov): ICMBOT in Simplified Chinese (`zh`) and Persian (`fa`) as full site languages,
offered on icmbot.one, on icmbot.es, in the Android app and in the phone layout. The first audience is
Chinese and Persian speakers in Europe, the US and elsewhere. Persian is the first right-to-left (RTL)
language, so most of the new work is layout, not words.

No code is written until the owner approves this plan.

# How languages work today (`main` at d38071d)

- `i18n/lang.ts`: `LANGS = ["en", "es"]`; `LANG_NAMES` gives each in its own words; `READY = ["en"]`
  (followed from the browser on icmbot.one); `APP_READY = ["en", "es"]` (followed from the phone in
  the Android app); `SPANISH_HOST` makes icmbot.es Spanish from the start. `detectLang`: `?lang=`
  (saved), the saved choice, the domain, the browser's first tag cut at "-" if READY, English.
  `offeredLangs` shows READY, the one in use, Spanish on icmbot.es, and APP_READY in the app. A
  comment says Chinese comes after Spanish.
- `messages/en.ts` joins 25 area files in `en/` (1,194 lines, about 1,110 keys); `es.ts` joins `es/`
  and is typed `Messages`, so a missing key fails `tsc`. `translate()` falls back to English.
  `tests/i18n.test.tsx` checks every language in `MESSAGES` has the same keys and `{placeholders}`.
- `components/LanguageMenu.tsx`: one pill per offered language; `short` shows "EN"/"ES" in the
  landing band and `HomeBand` (phone), full names on Home.
- `i18n/siteMeta.ts` (`SITE_META: Record<Lang, SiteMeta>`) and the Vite plugin give icmbot.es its own
  Spanish head and link preview (`VITE_SITE_LANG=es`, a second Render static site, plan 093 step 8).
- Numbers and dates: `NUMBER_LOCALES`, `localNumber`, `localFixed`, `placeOrdinal`; Spanish ordinals
  are also written by hand in `models/history.ts` and `LeaderboardParts.tsx`; dates in
  `ReportPage`, `LegalPage`, `leaderboardDates`, `BirthdayPicker`, `history.ts`.
- Server texts (coach reasons, bot reasons, hand names) arrive in English with codes and are
  translated in `i18n/coach.ts` and `review.ts`; `i18n_coach` and `i18n_hands` tests read
  `reasons.py` and `bot_texts.py` and require Spanish for every code.
- The Android app loads https://icmbot.one (`capacitor.config.ts`, user agent `ICMBOTApp`) and the
  manifest already has `supportsRtl="true"`. No new app build is needed for anything here.

# Choosing and offering the language

- `LANGS = ["en", "es", "zh", "fa"]`; `LANG_NAMES`: `zh` "简体中文", `fa` "فارسی".
- `?lang=zh` and `?lang=fa` work from step 1 (preview, as `?lang=es` did). Browser tags: every `zh-*`
  (zh-CN, zh-Hans-CN, zh-SG, also zh-TW and zh-HK until Traditional exists, see open questions)
  gives `zh`; `fa-*` gives `fa`. They count only once the language is in READY (website) or
  APP_READY (app).
- Turning a language on adds it to READY and APP_READY together. From then on the menu offers it on
  icmbot.one, on icmbot.es (`offeredLangs` shows every READY language there too) and in the app,
  and a Chinese or Persian phone or browser gets it by itself. A saved choice and `?lang=` still win.
- Phone layout: four pills do not fit the landing band at 360 px beside "Log in". In `short` mode
  with more than two offered languages the menu becomes one native `<select>` showing the current
  language's name (Android opens its own picker). Full pills stay on Home.
- `<html lang>`: `zh-Hans` (so the browser picks Simplified glyph forms), `fa`. New
  `htmlDir(lang)`: `rtl` for `fa`, else `ltr`; `I18nProvider` sets both on `<html>`.
- Link previews: crawlers read only the HTML head. Instead of two more Render sites, the Vite
  plugin also writes `dist/zh/index.html` and `dist/fa/index.html` with their own head (`og:url`
  https://icmbot.one/zh/, a translated `og:image`), and a `/zh/` or `/fa/` path counts like the
  domain in `detectLang`. The app uses hash routes, so the bundle is the same. I did not verify that
  Render serves `/zh/` from `zh/index.html` without a rewrite rule; step 8 checks it first.

# Persian: right to left

- **The page follows `dir="rtl"`.** The 97 physical declarations in `styles/` (39 `left:`, 19
  `right:`, 18 `text-align`, 21 margin, padding and border sides) across 36 files become logical
  ones (`inset-inline-start`, `margin-inline-end`, `text-align: start`, `border-inline-start`). The
  4 `translateX(-50%)` only centre a box at `left: 50%`, which is the same both ways, so they stay.
  Flex rows, the tab bar, the header, menus and the bet controls then mirror by themselves.
- **What stays left to right** (`dir="ltr"` on the element): the felt with its seats, seat order,
  board, pot and bets; every card and card group (A♠ K♦); chip amounts and BB values; the hand
  replay in hand review and hand history (streets, cards, actions in order); the Report charts and
  the stack graph; the username, email and password fields. Words inside those islands are still
  Persian; the browser shapes them correctly inside an LTR box.
- **Mixed text.** A Latin name or "2,400" inside a Persian sentence can jump to the wrong side.
  `translate()` wraps each `{param}` in U+2068 and U+2069 (first-strong isolate marks, invisible and
  ignored by screen readers) when the language is RTL. Player names get `<bdi>`.
- **Arrows**: the ‹ back button (`LeaderboardPage`) and the 3 → in `MistakeCard` and `HandReview`
  flip in RTL; ▶ and ⏸ on the clock do not.
- **Digits**: `fa-IR` writes ۴۵٬۰۰۰ (Persian digits) by default; `fa-IR-u-nu-latn` writes Latin
  digits. One choice for the whole site (open question). Number inputs (bet amount, ICM calculator,
  birthday) accept ۰ to ۹ and ٠ to ٩ and turn them into Latin digits before parsing.
- **Dates**: `fa-IR` defaults to the Solar Hijri calendar. The plan uses `fa-IR-u-ca-gregory`
  (Gregorian with Persian month names) so the birthday picker and every date stay one calendar.
- **Font**: Vazirmatn (SIL Open Font License), served from `public/fonts` as woff2 with a
  `unicode-range` for Arabic script, so only pages with Persian glyphs download it. A font file, not
  a package. Its weight is measured in step 3.
- **Script styles**: letter-spacing breaks the joined Persian letters, so `:lang(fa)` sets it to 0
  (59 declarations use it); `text-transform: uppercase` does nothing; line-height grows a little.

# Chinese

- **Font**: no web font (a full CJK font is several MB). Under `:lang(zh)` the stack is Archivo
  (Latin and digits), then "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC",
  "Source Han Sans SC", sans-serif. letter-spacing 0, as for Persian.
- **Numbers and dates**: `zh-CN` groups as 45,000 and writes 6.5, like English; no 万 (ten thousand)
  units. Dates "11月5日". Ordinals "第5名".
- **Line breaking**: Chinese breaks between any two characters, so long texts wrap fine; buttons with
  `white-space: nowrap` get shorter. `line-break: strict` keeps "，" and "。" off the start of a line.
- **Poker words** (a draft for the reviewer): Chinese players use Chinese words for actions and
  streets: 弃牌 fold, 过牌 check, 跟注 call, 下注 bet, 加注 raise, 全下 all-in, 底池 pot, 盲注
  blinds, 翻牌前 preflop, 翻牌 flop, 转牌 turn, 河牌 river, 摊牌 showdown, 锦标赛 tournament.
  Abbreviations stay Latin as on Chinese poker sites: BB, ICM, EV, SPR, VPIP and the positions
  UTG, HJ, CO, BTN, SB, BB. So unlike Spanish, the streets are translated.
- **Persian poker words** (draft): Persian players mostly use the English words in Persian letters:
  فولد, چک, کال, بت, ریز, آل‌این, پات, فلاپ, ترن, ریور; BB, ICM and positions stay Latin.

# Long texts and the native check

- Every key is drafted by Claude per area, from the English and the Spanish (the Spanish shows which
  sentences were already reworded for a non-English reader). Drafts follow a term sheet (the word
  lists above), fixed in step 4 and kept in `i18n/messages/TERMS_zh_fa.md`.
- Long areas: `glossaryTerms` (113 lines), `glossary`, `coach` (the coach's reasons per server code),
  `hands` (bot reasons), `legal`, `landing`, the link-preview heads. The legal pages say in both
  languages that the English text governs. The hero picture and `og:image` get a Chinese and a
  Persian screenshot, as `hero-app-es.webp` and `og-app-1200x630-es.jpg` did.
- `zh.ts` and `fa.ts` start as `{ ...en }` and each area PR spreads its translated file over it, so
  plan 111's new `a11y` keys never block either plan.
- A language enters READY only after a native speaker who plays poker has read every screen (the
  owner's translator, open question) and their fixes are in. A new test then fails if any zh or fa
  value is still the English one, apart from a short list (ICMBOT, BB, ICM, numbers only).

# Where players can use it

Not legal advice. Chinese and Persian speakers in Europe, the US and elsewhere use ICMBOT normally:
the site, the Android app and Pro are the same as for anyone there.

- **Mainland China**: no Google Play, Google sign-in and Google Fonts are blocked, a site hosted in
  China needs an ICP filing, an app store there needs a game licence, and poker is a sensitive
  category even without money. I did not check whether icmbot.one loads there. A decision for later.
- **Iran**: US sanctions block Google Play and foreign card payments (so no Pro there), and gambling
  is illegal. ICMBOT has no real money, but poker sites may still be filtered. A decision for later.

# Steps (one PR each)

1. **Language plumbing.** `zh`, `fa` in LANGS and LANG_NAMES; `zh.ts`, `fa.ts` as `{ ...en }`;
   `htmlLang`, `htmlDir`, `dir` on `<html>`; locales, one `placeOrdinal` used by `history.ts` and
   `LeaderboardParts`; digit input normalising; the `<select>` menu; browser tags; `SITE_META`
   typed per site. READY and APP_READY unchanged, so the live site looks the same.
2. **RTL base.** Logical properties across `styles/`, the LTR islands, the arrow flips,
   isolate marks in `translate()`, `<bdi>` names, a CSS guard test. English is unchanged.
3. **Fonts and script styles.** Vazirmatn, the CJK stack, letter-spacing, line-height, line-break.
4. **Entry screens** (both languages, about 260 lines): auth, landing, tabs, theme, home, plans,
   portrait, portraitPrompt, profile; the term sheet.
5. **The table** (about 265): table, tableStrip, coach, a11y (after plan 111 is complete).
6. **Review** (about 260): hands, review, handHistory, mistakes, report; zh and fa added to the
   `i18n_coach` and `i18n_hands` server-code tests.
7. **Learn** (about 360): glossary, glossaryTerms, quiz, practice, tools, leaderboard.
8. **Legal and link previews**: legal, the `/zh/` and `/fa/` heads, og images, hero pictures.
9. **Chinese on**, after its native review: the reviewer's fixes, `zh` in READY and APP_READY.
10. **Persian on**, the same, plus a check on a real Android phone set to Persian.
11. **Show the languages on the landing page** (the owner, 5 Nov), after Persian is on. At the top, the
    language menu already offers all four (step 1's `<select>` on a phone). Near the bottom, a new
    section `MinimalLanguages.tsx` before `MinimalClosing`: "Play in your language" with one tile per
    READY language, each tile written in its own language and script ("English", "Español", "中文",
    "فارسی", plus one short line, for example "用中文练习锦标赛"). A tile switches the page to that language,
    as the menu does. In the footer, a line "English · Español · 中文 · فارسی" that does the same. Both
    show only READY languages, so nothing points at an unfinished language. Every tile and footer item
    carries its own `lang`, and the Persian one `dir="rtl"`, so each renders right whatever the page
    language is. Same on icmbot.one, icmbot.es and in the app (the app has no landing page, plan 085,
    so there it is the menu only). The section title in en, es, zh and fa, checked by the reviewers.

The prime-agent prompt is `prime-agent-spec/PLAN_113_CHINESE_PERSIAN_PROMPT.md`.

# Tests

New `frontend/tests/i18n_rtl.test.tsx`; additions to `i18n.test.tsx` and `site_meta.test.ts`.

- **Keys and placeholders**: the existing loop over `MESSAGES` covers zh and fa once they are in it.
- **Detection**: `?lang=zh`, `?lang=fa`, `zh-Hans-CN`, `zh-TW`, `fa-IR` in a browser and in the app,
  before and after READY; `/zh/` and `/fa/` paths; a saved choice still wins.
- **Offered**: `offeredLangs` on icmbot.one, icmbot.es and in the app; the `<select>` in `short` mode.
- **dir**: picking فارسی sets `<html dir="rtl" lang="fa">`; English sets it back to `ltr`; zh gives
  `lang="zh-Hans"`. Under `fa` the felt, the cards and the charts have `dir="ltr"` and the seats are
  in the same DOM order as in English.
- **Text**: `translate("fa", ...)` isolates params, en and zh do not; numbers, ordinals and dates in
  zh and fa; Persian digits typed in the bet box give the right amount.
- **CSS guard**: no physical left or right in `styles/` outside the LTR files (felt, seats, cards,
  placement, charts).
- **Browser**: `scripts/table-fit/check.mjs` loops over en, es, zh, fa at 360, 390 and 1280 px: no
  sideways scroll, the table fits, the seat positions under fa equal those under en, and the tab bar
  and header are mirrored. Screenshots of each go in the PR.
- **Languages section**: the section and the footer line list exactly the READY languages, in their
  own words; a click on 中文 sets `<html lang="zh-Hans">`, on فارسی `dir="rtl"`; each item has its own
  `lang`; screenshots at 360, 390 and 1280 px in all four languages.
- **Turn-on**: no READY zh or fa value equals the English outside the short list.
- Both suites green, counts in `progress.md`; each regression test proven by reverting its fix.

# Not in this plan

- Traditional Chinese (`zh-Hant`), Dari and Tajik variants.
- Publishing in mainland China or Iran (stores, ICP filing, payments, a licence).
- Google Play store listing texts in zh and fa (a Play Console task for the owner).
- Admin pages (English only), the demo and ad videos, Coach Speak voices in zh and fa (plan 112).
- Server sentences that still have no code (the coach tool's teaching paragraph) stay English.

# Open for the owner

- Who reviews each language: a paid translator who plays poker, or a player from the community.
- Persian digits (۴۵٬۰۰۰) or Latin digits (45,000) on the whole site. The plan assumes Persian.
- Gregorian dates in Persian (as planned) or the Solar Hijri calendar.
- Traditional Chinese later. Until then zh-TW and zh-HK browsers get Simplified (as planned) or
  English.
- A domain of their own (for example a .cn or a Persian-named domain) or the `/zh/` and `/fa/`
  paths on icmbot.one (as planned). A .cn domain needs a Chinese ICP filing.
- Which language turns on first. The plan does Chinese first because it needs no RTL check.
