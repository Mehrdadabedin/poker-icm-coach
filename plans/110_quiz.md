---
id: 110
title: Quiz under Learn, Two Face-down Cards per Question
phase: 8
status: planned
depends_on: [097, 100, 109]
test_file: backend/tests/test_quiz.py
implementation_files: [backend/app/services/quiz_spots.py, backend/app/services/quiz_store.py, backend/app/services/quiz_totals.py, backend/app/models/orm_quiz.py, backend/app/api/routes_quiz.py, backend/app/schemas/quiz_schemas.py, backend/app/main.py, backend/app/core/config.py, frontend/src/pages/QuizPage.tsx, frontend/src/components/QuizCards.tsx, frontend/src/components/QuizAnswer.tsx, frontend/src/services/quizApi.ts, frontend/src/components/menuEntries.ts, frontend/src/App.tsx, frontend/src/styles/quiz.css, frontend/src/i18n/messages/en/quiz.ts, frontend/src/i18n/messages/es/quiz.ts, frontend/public/cards/quiz-back-red.png, frontend/public/cards/quiz-back-blue.png]
---

# Objective

The owner (3 Nov): a Pro quiz under Learn with unlimited random questions. Each question starts as two
face-down cards with the ICMBOT robot back, red or blue at random. A tap or click turns them over and
shows the situation. The player picks an action, and the coach says whether it was right and why.

No code is written until the owner approves this plan.

# Decisions

## Questions come from the engine, not from an AI model

- A question is a template filled from a seeded `random.Random`. The seed rebuilds the spot, so nothing
  is stored per question and there is no question bank to maintain.
- The answer and the reason come from `Coach.recommend`, the same coach as the table. The quiz and the
  coach never disagree, and a question costs no API credit.
- The first version is preflop only. The coach answers in 1 to 4 ms there; postflop comes later.

## Templates

| Template | Spot | Level |
|---|---|---|
| Open push or fold | Folded to the hero, 5 to 15 big blinds, late position | Easy |
| Call an all-in | One player is all in, hero has 8 to 25 big blinds | Medium |
| Bubble | Players left = places paid + 1, stacks of different sizes | Medium |
| Final table pay jump | 3 to 6 left, 2 or more paid | Hard |
| Open from position | 20 to 40 big blinds, any seat, folded to the hero | Easy |

Every spot passes `CoachAdviceRequest` validation before it is used, so the quiz can only build spots the
coach accepts.

## Only good questions

- **Close calls are skipped:** `confidence` below `QUIZ_MIN_CONFIDENCE` (0.60) means two answers are
  nearly as good, and a player should not be marked wrong on a coin flip.
- **Odd spots are skipped:** a stack under 2 big blinds, or a pot the blinds cannot explain.
- **Retry limit:** up to 20 tries per question, then the next template.
- **No repeats:** the last 50 spots per player (hand class, template, position, stack band) are not
  served again. This is kept in memory.

## Answers

- **Choices:** only the actions that are legal in the spot. Folded to the hero: Fold, Raise, All-in.
  Facing an all-in: Fold, Call.
- **Grading:** the coach's `recommended_action` is right. Its `alternative_action` is shown as "also
  played", but does not count as right.
- **After answering:** the coach's reason in the page language (`reason_code` and `reason_params`, plan
  093), plus glossary terms (plan 097) for ICM, bubble, big blind and pay jump.

## The answer stays on the server until the player answers

- `POST /api/quiz/question` returns the cards, the situation and the choices, never the answer.
- The server keeps up to 5 open questions per player in memory: id, seed, template and time. A restart
  drops them, and the page then deals a new one. The app runs one worker (CLAUDE.md), so memory is
  enough.
- `POST /api/quiz/answer {id, choice}` grades the answer once and closes the question. A second answer,
  or an unknown or other player's id, returns 404 (hard rule 8).

## Difficulty adapts

- Easy, Medium and Hard, chosen from the templates above.
- 5 right in a row moves the player up a level. 2 wrong in a row moves them down.
- The level is kept in memory per player. It starts at Easy after a restart.

## Unlimited for Pro, protected from scripts

- Both routes use `require_pro`, so Free players get 402 and see the existing lock card (plan 100).
- Plan 109's limiter gives the quiz its own bucket, `RATE_LIMIT_QUIZ` (60/60 per user), separate from the
  table coach. A fast quiz player is never blocked from the coach at a table.
- The limit follows `RATE_LIMITS_ENABLED` and `RATE_LIMIT_COACH_MODE` like the coach.
- This depends on plan 109 being merged first.

## What is saved

- One row per player per day in `quiz_daily`: owner, day (UTC), answered, correct, best streak.
- Saving is an upsert, created with `checkfirst` like the other archive tables, plus an Alembic migration.
- Memory mode (no database) keeps the same totals in memory.
- Individual questions and answers are not saved.
- A daily goal of 20 questions with a streak counter. Players can keep going past it.

## The cards

- Two cards face down, both with the same back. The back is chosen at random each question: red or blue.
- **Tap or click, not hover:** phones and the Android app have no hover, and hover would turn the cards
  over before the player is ready.
- Tapping either card turns both over together, in about 0.5 s (CSS 3D `rotateY`). With
  `prefers-reduced-motion` they appear face up at once.
- On a computer the cards lift slightly under the mouse, to show they can be clicked (`@media (hover:
  hover)`).
- The two cards are one button, "Show the cards", so Enter and Space work.
- The answer buttons stay hidden until the cards are face up. The situation text shows at the same time.
- **New artwork:** the owner's two backs (`~/Downloads/RedICMBOT Robot Card Back.png` and `Blue ICMBOT
  Symmetrical Card Back.png`, 1024x1536) become `quiz-back-red.png` and `quiz-back-blue.png` at 250x375,
  PNG (hard rule 9).
- The table keeps its own backs and the player's setting.

## Situation text, for example

"Bubble: 4 players left, 3 paid. You are on the button with 12 big blinds. Blinds 500/1000, ante 100.
Folded to you." Numbers come from the spot. The template only picks the wording.

## Place

- A Quiz card in `STUDY` (`menuEntries.ts`) with `pro: true`. It shows on Home's Study group and on the
  Learn tab page.
- The page is `#/quiz`, wrapped in `ProOnly`. `/quiz` is added to the Learn tab's `pages`.

# Steps

1. **Spots.** `quiz_spots.py`: templates, seeded generation, validation, the confidence filter, the
   level, and the legal choices. Tests run every template over 500 seeds.
2. **Store.** `quiz_store.py`: open questions, the repeat window, the level, and an injected clock.
3. **Totals.** `orm_quiz.py`, `quiz_totals.py` and the migration: the daily row and memory mode.
4. **Routes.** `routes_quiz.py`, `quiz_schemas.py`, the rate limit setting and the bucket.
5. **Card backs.** Resize the owner's two PNGs, with the script command written in the commit message.
6. **Page.** `QuizPage.tsx`, `QuizCards.tsx` (turning over), `QuizAnswer.tsx` (choices, result, reason,
   Next), `quizApi.ts`, `quiz.css`, and English and Spanish text.
7. **Menu.** The STUDY entry, the route and the Learn tab's `pages`.

Every file stays at 200 lines or fewer (hard rule 6). The routes are plain `def`, and no `async def` calls
a session method (hard rule 2).

# Tests

`backend/tests/test_quiz.py`, `test_quiz_spots.py`, `frontend/tests/quiz.test.tsx`.

- **Spots:** the same seed gives the same spot. Every generated spot passes `CoachAdviceRequest`. No
  served spot has a confidence under the minimum. The choices are legal for the spot.
- **Answer hidden:** the question response has no field holding the answer. Check the JSON keys and the
  values, not only the names.
- **One answer:** the first answer is graded, a second gets 404, and another player's id gets 404.
- **Plans:** Free gets 402. The rate limit gives 429 in enforce mode and logs only in log mode.
- **Totals:** answered, correct and best streak add up, in memory mode and with PostgreSQL. The database
  test skips when there is no database.
- **Levels:** up after 5 right in a row, down after 2 wrong in a row.
- **Page:** cards start face down with a red or blue back. A tap turns both over and shows the
  situation and choices. Reduced motion turns them over without the animation. Keyboard works. A result
  shows the coach's reason. Next deals a new face-down pair.
- English and Spanish have the same keys.
- Reverting each check makes its test fail, with a message naming the cause (repo rule).
- Both suites stay green, and the counts go in `progress.md`.

# Not in this plan

- Postflop questions.
- Practice weak spots ("you miss bubble calls, practise those").
- A quiz leaderboard.
- Free daily questions.
- Using the new backs at the table.

# Open for the owner

- Free players: none (as written), or a few a day as a taste of Pro.
- The numbers: 60 questions a minute, a daily goal of 20, a minimum confidence of 0.60.
- Short stacks: should All-in count as right when the coach says Raise and the stack is 12 big blinds or
  less? As written, only the coach's exact action is right.
- The new backs at the table too, or the quiz only (as written).
- The card back's border, with cherubs in the corners, looks a lot like a well-known commercial card back.
  Check that it is different enough before a paid app uses it; redrawing the border avoids the question.

# Not verified

- How varied the questions feel. Templates over random values give many spots, but some may feel alike.
  The repeat window helps.
- The coach's quality on every generated spot. The quiz is only as right as the coach.
- How long a question takes to build. 1 to 4 ms was measured for single coach calls, and the filter may
  retry up to 20 times.
