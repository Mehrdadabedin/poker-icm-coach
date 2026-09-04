# Playing-Card Assets — Source & License (A17)

## Source

The card face artwork is the **Public Domain Deck / OpenDecks** set:

- Repository: https://github.com/AustinGabriel/OpenDecks-Public-Domain-and-CC0-Playing-Cards
- Contains all 52 standard poker cards + 2 jokers + card backs, as SVG and PNG.

This project installs only the **52 standard poker cards** (Ace through King in
Spades, Hearts, Diamonds, Clubs) and one card back, in BOTH local formats
(**PNG** and **SVG**) under `frontend/public/cards/`. No jokers are installed;
the poker game does not use jokers.

The production frontend renderer uses the **PNG** set
(`PlayingCard` resolves `cards/<rank><suit>.png` and `cards/back.png`); the SVG
set is retained in the same asset directory as the source-of-truth vector
form. Both sets are served locally by the built application — no runtime URL
or CDN dependency.

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

OpenDecks files use the form `<rank> of <suit>.svg` / `.png`, e.g.
`8 of hearts.png`. The mapping layer in
`scripts/import_opendecks_cards.py` converts every app identifier to the correct
OpenDecks asset and copies it into `frontend/public/cards/<rank><suit>.<ext>`
for both `svg` and `png`, e.g.:

| App id | OpenDecks source | Installed file (PNG, same base-name SVG also installed) |
|---|---|---|
| 8H | `hearts/8 of hearts.png` | `frontend/public/cards/8h.png` |
| AS | `spades/ace of spades.png` | `frontend/public/cards/As.png` |
| KH | `hearts/king of hearts.png` | `frontend/public/cards/Kh.png` |
| 10D | `diamonds/10 of diamonds.png` | `frontend/public/cards/Td.png` |
| QC | `clubs/queen of clubs.png` | `frontend/public/cards/Qc.png` |
| 2C | `clubs/2 of clubs.png` | `frontend/public/cards/2c.png` |

The mapping is deterministic and complete: all 52 ranks x suits for both
formats. The runtime component (`PlayingCard`) resolves `cards/<rank><suit>.png`;
no runtime URL or remote dependency is used.

## Installed assets

- 52 card-face PNGs + 1 card back PNG (`back.png`, from OpenDecks
  `card back blue.png`) — used by the production renderer.
- 52 card-face SVGs + 1 card back SVG (`back.svg`, same OpenDecks source) —
  retained as the vector source of truth in the same asset directory.
- Assets are served locally by the built frontend (`vite` copies `public/` into
  `dist/`).

## Regenerating / updating

Run:

```bash
python3 scripts/import_opendecks_cards.py [path-to-opendecks-checkout]
```

The script validates the source directory before copying and fails if any of the
52 mappings is missing, so the deck can never silently end up incomplete.
