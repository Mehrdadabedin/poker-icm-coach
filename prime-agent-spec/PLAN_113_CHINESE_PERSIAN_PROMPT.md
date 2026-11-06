# Prime-Agent Prompt: plan 113, Simplified Chinese and Persian

You are working in the ICMBOT repository. Read `CLAUDE.md` first and follow it.
Then read `plans/113_chinese_and_persian.md` and `plans/093_spanish.md` on
`main`. Build it only after the owner has approved plan 113. The owner
answered its open questions on 5 Nov ("Owner's decisions" in the plan):
Persian digits, Solar Hijri dates, zh-TW and zh-HK get Simplified, the `/zh/`
and `/fa/` paths, Persian turns on first, a community player reviews each
language.

## Where to work

```
cd /home/mehrdad/Projects/poker-icm-coach
git fetch origin
git worktree add ../poker-icm-coach-zhfa-build origin/main -b feat/lang-zh-fa-plumbing
ln -s /home/mehrdad/Projects/poker-icm-coach/frontend/node_modules ../poker-icm-coach-zhfa-build/frontend/node_modules
```

Other sessions use the main checkout and its sibling worktrees: never switch
their branches. Never commit the `node_modules` link; add files by name. Every
command under `timeout 300` (`timeout 900` for full test runs).

Ten PRs, in order, one branch each, each from `origin/main` after the one
before is merged: `feat/lang-zh-fa-plumbing`, `feat/rtl-base`,
`feat/zh-fa-fonts`, `feat/zh-fa-entry`, `feat/zh-fa-table`,
`feat/zh-fa-review`, `feat/zh-fa-learn`, `feat/zh-fa-legal-previews`,
`feat/fa-on`, `feat/zh-on`. Steps 9 and 10 wait for each language's reviewer.

## What exists today (read these first)

- `i18n/lang.ts` (`LANGS`, `LANG_NAMES`, `READY`, `APP_READY`, `SPANISH_HOST`,
  `detectLang`, `offeredLangs`, `htmlLang`, number locales, `placeOrdinal`),
  `I18n.tsx`, `translate.ts`, `siteMeta.ts`, `vite.config.ts` (`siteHead`).
- `i18n/messages/en.ts` and `es.ts` join one file per area from `en/` and
  `es/`; `tests/i18n.test.tsx` checks keys and placeholders for every entry of
  `MESSAGES`.
- `components/LanguageMenu.tsx` (`short` in `MinimalHeader` and `HomeBand`),
  `styles/lang-menu.css`.
- Hand-written Spanish ordinals: `models/history.ts`, `LeaderboardParts.tsx`.
  Dates: `ReportPage`, `LegalPage`, `leaderboardDates`, `BirthdayPicker`,
  `history.ts`.
- `scripts/table-fit/check.mjs` loops over `en` and `es` at several widths.
- 200 lines max per `.ts`/`.tsx`; no em dashes; no `any`, no `console.*`.

## PR 1: language plumbing (`feat/lang-zh-fa-plumbing`)

1. `LANGS` gains `zh`, `fa`; `LANG_NAMES` "简体中文", "فارسی". Replace the
   "Chinese comes after Spanish" comment.
2. `messages/zh.ts` and `fa.ts`: `{ ...en }` typed `Messages`, joined in
   `MESSAGES`. Later PRs spread each translated area over it.
3. `htmlLang`: `zh-Hans`, `fa`. New `htmlDir`. `I18nProvider` sets `lang` and
   `dir` on `<html>`.
4. Locales: `zh-CN`; `fa-IR` (its defaults: Persian digits, Solar Hijri
   dates). `i18n/jalali.ts` converts Solar Hijri to Gregorian and back; under
   `fa` `BirthdayPicker` shows Solar Hijri years, months and days, weeks from
   Saturday, and saves the same Gregorian date. `localNumber` and `localFixed` go
   through `Intl` for every language but English. One `placeOrdinal` with a
   message key per language (`第{n}名`, `رتبه {n}`, `{n}.º`), used by
   `history.ts` and `LeaderboardParts`.
5. A small `parseDigits` that turns ۰-۹ and ٠-٩ into 0-9, used by the bet
   amount box, the ICM calculator and the birthday input.
6. `detectLang`: every `zh-*` tag gives `zh` (zh-TW and zh-HK too, the
   owner's choice), `fa-*` gives `fa`, still only when READY or APP_READY.
7. `LanguageMenu`: in `short` mode with more than two offered languages, one
   `<select>` named by `lang.label`; pills otherwise.
8. `SITE_META` stays English and Spanish for now: type it per site
   (`Partial` or a `SiteLang`), so `zh` and `fa` need no head yet.

READY and APP_READY do not change. Tests in `i18n.test.tsx` and the new
`i18n_rtl.test.tsx`: detection, `offeredLangs`, `<select>`, `lang` and `dir`
on `<html>`, numbers, ordinals, dates, `parseDigits`.

## PR 2: RTL base (`feat/rtl-base`)

1. Every physical left or right in `styles/` becomes logical, except in the LTR
   files (felt, seats, table seats, cards, placement, charts). Keep each file's
   rules in the same order so the diff is easy to read.
2. `dir="ltr"` on the felt, card groups, chip amounts, the hand replay in hand
   review and hand history, the Report charts and stack graph, and the
   username, email and password inputs.
3. The 4 `translateX(-50%)` centre a box at `left: 50%`; leave them. Any
   slide-in panel must open from the reading side (check the drawer and sheets).
4. The ‹ back button and the → in `MistakeCard` and `HandReview` flip in RTL.
5. `translate()` wraps each param in U+2068 and U+2069 when the language is
   RTL; player names in `<bdi>`.
6. A test reads every file in `styles/` and fails on a physical left or right
   outside the LTR list, naming file and line.

English must look the same: run `scripts/table-fit/shots.mjs` before and after
at 360, 390 and 1280 px and compare. Check `?lang=fa` with English text in the
browser: the page mirrors, the felt does not.

## PR 3: fonts and script styles (`feat/zh-fa-fonts`)

Vazirmatn woff2 (regular and bold) in `public/fonts` with its OFL licence file,
an `@font-face` with the Arabic `unicode-range`, used under `:lang(fa)`. The CJK
stack under `:lang(zh)`. letter-spacing 0 under both, `line-break: strict` for
zh. Justify the font files in the commit message and give their size.

## PRs 4 to 7: translations, both languages in each

Areas as in plan 113 steps 4 to 7. PR 4 also adds
`i18n/messages/TERMS_zh_fa.md`, the term sheet every later PR follows. Write
each area from the English and the Spanish; keep the Chinese and Persian poker
words of the term sheet; keep BB, ICM, EV, SPR, VPIP and positions in Latin.
`.one` and `.other` keys get the same text. PR 5 starts only after plan 111 is
complete, so its `a11y` keys are final. PR 6 adds zh and fa to the server-code
checks in `i18n_coach.test.tsx` and `i18n_hands.test.tsx`.

After each PR, open the screens of that area with `?lang=zh` and `?lang=fa` at
390 and 1280 px. Report anything that overflows or reads in the wrong order.

## PR 8: legal and link previews (`feat/zh-fa-legal-previews`)

1. `legal` in both languages, each saying the English text governs.
2. The Vite plugin also writes `dist/zh/index.html` and `dist/fa/index.html`
   with `siteHtml`; `SITE_META` gains `zh` and `fa` (`og:url`
   https://icmbot.one/zh/ and /fa/, `zh_CN`, `fa_IR`); hreflang names all four.
3. `detectLang` treats a `/zh/` or `/fa/` path like the domain.
4. Hero picture and og image per language from real screenshots, new file
   names (crawlers cache by URL).

First check on a Render preview or with the owner that `/zh/` serves
`zh/index.html`. If it does not, write the rewrite rule the owner must add and
stop for their answer.

## PRs 9 and 10: turning each language on (`feat/fa-on`, `feat/zh-on`)

Persian first (PR 9), Chinese second (PR 10), each when its reviewer is done.
Apply the native reviewer's fixes, then add the language to READY and
APP_READY. Add the completeness test: no value of a READY zh or fa equals the
English, outside a short list (ICMBOT, BB, ICM, numbers only). Extend
`scripts/table-fit/check.mjs` to the language and run it. For Persian, check
the Android app on a phone set to Persian, or say you did not.

## PR 11: the languages on the landing page (`feat/landing-languages`)

After PR 9 (Persian on) is merged. Plan 113 step 11: `landing-minimal/MinimalLanguages.tsx`
("Play in your language", one tile per READY language in its own words and
script, a tap switches the page language like `LanguageMenu`), placed before
`MinimalClosing` in `pages/MinimalLandingPage.tsx`; a footer line in
`MinimalFooter.tsx` with the same languages. Only READY languages show. Each
item gets its own `lang`, the Persian one `dir="rtl"`. New keys in en, es, zh
and fa; ask the owner for the reviewers to check the zh and fa lines. Tests as
in the plan, and screenshots at 360, 390 and 1280 px in all four languages,
dark and light.

## Git and checks, every PR

- `npm run lint`, the full `npx vitest run` and all pre-push gates pass.
  Report the test counts before and after.
- Plan 113 `in-progress` from PR 1 with its `progress.md` row updated each PR;
  `complete` after PR 11.
- PR body with "## What changed" and "## Tests" sections, as recent PRs.
- Push and open the PR to `main`. Do not merge.

Report: the PR links, the test counts before and after, screenshots at 360, 390
and 1280 px in zh and fa, and anything you did not check.
