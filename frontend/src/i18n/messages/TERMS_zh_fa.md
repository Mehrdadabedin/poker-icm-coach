# Term sheet: Simplified Chinese (zh) and Persian (fa)

Plan 113. Every zh and fa message file follows this sheet. Drafts by Claude, from the English and the Spanish; a
poker player from the community reviews each language before it is READY, and their changes come back here
first, then into the files.

## Kept in Latin letters in both

ICMBOT, Pro, Free (the plan names), ICM, BB, EV, SPR, VPIP, PFR, the positions (UTG, UTG+1, MP, LJ, HJ, CO, BTN,
SB, BB), the card ranks and suits (A♠ K♦), Google, JPG, PNG, WebP, JSON, and the word DELETE that the account
page asks to be typed (the code compares it).

## Poker words

| English | zh | fa |
|---|---|---|
| fold | 弃牌 | فولد |
| check | 过牌 | چک |
| call | 跟注 | کال |
| bet | 下注 | بت |
| raise | 加注 | ریز |
| all-in | 全下 | آل‌این |
| pot | 底池 | پات |
| blinds | 盲注 | بلایندها |
| stack | 筹码 / 后手 (in "stack of 20 BB") | استک |
| chips | 筹码 | چیپ |
| preflop | 翻牌前 | پری‌فلاپ |
| flop | 翻牌 | فلاپ |
| turn | 转牌 | ترن |
| river | 河牌 | ریور |
| showdown | 摊牌 | شودان |
| hand | 手牌 (cards), 一手 (a hand played) | دست |
| tournament | 锦标赛 | تورنمنت |
| table | 牌桌 | میز |
| seat | 座位 | صندلی |
| bot | 机器人 | ربات |
| coach | 教练 | مربی |
| ICM coach | ICM 教练 | مربی ICM |
| range | 范围 | رنج |
| leak | 漏洞 | نشتی |
| leaderboard | 排行榜 | جدول رده‌بندی |
| Tight-Aggressive | 紧凶 | تایت‌اگرسیو |
| Loose-Aggressive | 松凶 | لوزاگرسیو |
| Tight-Passive | 紧弱 | تایت‌پسیو |
| Loose-Passive | 松弱 | لوزپسیو |
| Preferred / Acceptable / Suboptimal | 最佳 / 可接受 / 欠佳 | بهینه / قابل قبول / غیربهینه |

## Writing rules

- Chinese: full-width punctuation (，。：？！（）“”). One space between Chinese and a Latin word or a
  number ("ICM 教练", "使用 Google 继续", "{min} 个字符"), none before full-width punctuation. "你" (not
  "您") throughout, as the English and Spanish address the player directly and informally.
- Persian: Persian punctuation (، ؛ ؟), the zero-width non-joiner (U+200C) in compound words ("تصمیم‌ها",
  "آل‌این"), informal "تو" forms as in the Spanish "tú". Numbers written into a message use Persian digits
  (۹ نفره, ۱۸ سال), like the numbers the code fills in (owner, 5 Nov).
- `{placeholders}` stay exactly as in English; the code fills them (and isolates them under fa).
- `.one` and `.other` keys get the same text: neither language changes the noun for one.
- Words the player types or a machine reads (DELETE, Google, file types) stay in Latin.
- Upper-case English titles (STUDY, REVIEW) have no case in zh or fa: write them normally.
- Chinese keeps the birthday field's English order, day first, so its placeholder is 日/月/年. A reviewer
  may ask for year first, as under fa; that is a code change (the field's shape), not a word change.
- The birthday placeholder under fa is an example Solar Hijri day, year first (۱۳۷۰/۰۵/۱۲), because the field
  takes that shape (plan 113 step 1). Keep it a date, not words.
