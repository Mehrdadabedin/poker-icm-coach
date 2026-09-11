# Playing-Card Assets — Source & License (A17)

## Source

The card face artwork is the **Public Domain Deck / OpenDecks** set:

- Repository: https://github.com/AustinGabriel/OpenDecks-Public-Domain-and-CC0-Playing-Cards
- Contains all 52 standard poker cards + 2 jokers + card backs, as SVG and PNG.

This project installs only the **52 standard poker cards** (Ace through King in
Spades, Hearts, Diamonds, Clubs) and one card back, as **PNG**, under
`frontend/public/cards/`. No jokers are installed; the poker game does not use
jokers.

The frontend renderer resolves `cards/<rank><suit>.png` and `cards/back.png`,
and those files are served locally by the built application — no runtime URL or
CDN dependency. **Only PNG is installed.** `public/` is copied verbatim into
`dist/` and into the Android APK, so the parallel SVG deck that used to sit
beside it was ~7.5 MB nothing ever loaded. The vectors remain the upstream
source of truth in the OpenDecks repository, one `git clone` away.

## License verification (CC0 / public domain)

- The repository ships a `LICENSE` file that is the **Creative Commons Legal
  Code — CC0 1.0 Universal**.
- The README explicitly states: *"All assets in this repository are public
  domain / CC0. That means you can use, copy, modify, merge, publish,
  distribute, sell, and/or print physical decks based on this project for
  commercial or non-commercial purposes, without asking permission and without
  attribution."*
- All third-party sources credited by the deck (court cards, pips, ranks,
  card backs) are independently released under CC0 or dedicated to the public
  domain.
- A copy of the CC0 license text is bundled locally with the assets at
  `frontend/public/cards/OPEN_DECKS_LICENSE.txt`.

## Asset mapping (application identifier -> OpenDecks file)

The application already identifies a card by `rank` + `suit`:

| App identifier | Meaning |
|---|---|
| rank: 2-9, T, J, Q, K, A | 2-9, Ten, Jack, Queen, King, Ace |
| suit: c, d, h, s | Clubs, Diamonds, Hearts, Spades |

OpenDecks files use the form `<rank> of <suit>.png`, e.g. `8 of hearts.png`.
The mapping layer in `scripts/import_opendecks_cards.py` converts every app
identifier to the correct OpenDecks asset and copies it into
`frontend/public/cards/<rank><suit>.png`, e.g.:

| App id | OpenDecks source | Installed file |
|---|---|---|
| 8H | `hearts/8 of hearts.png` | `frontend/public/cards/8h.png` |
| AS | `spades/ace of spades.png` | `frontend/public/cards/As.png` |
| KH | `hearts/king of hearts.png` | `frontend/public/cards/Kh.png` |
| 10D | `diamonds/10 of diamonds.png` | `frontend/public/cards/Td.png` |
| QC | `clubs/queen of clubs.png` | `frontend/public/cards/Qc.png` |
| 2C | `clubs/2 of clubs.png` | `frontend/public/cards/2c.png` |

The mapping is deterministic and complete: all 52 ranks x suits. The runtime
component (`PlayingCard`) resolves `cards/<rank><suit>.png`; no runtime URL or
remote dependency is used.

## Installed assets

- 52 card-face PNGs + 1 card back PNG (`back.png`, from OpenDecks
  `card back blue.png`) — used by the production renderer.
- Issue #6: these PNGs are downsampled to 300x420 (the OpenDecks 5:7 aspect)
  by `scripts/optimize_card_pngs.py`, which `import_opendecks_cards.py` also
  runs. Same artwork and filenames, deck size ~14.4 MB -> ~2.8 MB. Cards render
  at 52px wide, so the 1500x2100 source raster was pure bundle weight.
- Assets are served locally by the built frontend (`vite` copies `public/` into
  `dist/`).

## Regenerating / updating

Run:

```bash
python3 scripts/import_opendecks_cards.py [path-to-opendecks-checkout]
```

The script validates the source directory before copying and fails if any of the
52 mappings is missing, so the deck can never silently end up incomplete.
