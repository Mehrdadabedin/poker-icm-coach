"""A17 — card asset completeness audit (frontend/public/cards).

Verifies the installed deck is exactly the standard 52-card set (+ card back)
as PNG — the only format the renderer loads — that the png assets are the
optimized 300x420 OpenDecks rasters (issue #6), and that the CC0 license text
is bundled for provenance. Mirrors the mapping in
scripts/import_opendecks_cards.py without depending on the OpenDecks checkout
being present.
"""
from __future__ import annotations

import ast
from pathlib import Path

ASSET_DIR = Path(__file__).resolve().parents[2] / "frontend" / "public" / "cards"

RANKS = {"A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"}
SUITS = {"s", "h", "d", "c"}


def _expected_faces() -> set[str]:
    return {f"{r}{s}" for r in RANKS for s in SUITS}


def test_exactly_52_png_card_faces_exist() -> None:
    files = {p.stem for p in ASSET_DIR.glob("*.png")}
    cards = {f for f in files if f != "back"}
    assert len(cards) == 52, f"expected 52 png card faces, found {len(cards)}"
    assert cards == _expected_faces(), f"missing/extra png faces: {_expected_faces() ^ cards}"


def test_each_png_is_optimized_300x420() -> None:
    """Issue #6: PNG faces are 300x420 (the OpenDecks 5:7 aspect, downsampled)
    and bounded in size. Cards render at 52px wide, so the 1500x2100 source
    raster was pure bundle weight. Reads width/height straight from the PNG
    IHDR chunk (no image lib)."""
    for rank in RANKS:
        for suit in SUITS:
            path = ASSET_DIR / f"{rank}{suit}.png"
            data = path.read_bytes()
            assert data.startswith(b"\x89PNG\r\n\x1a\n"), f"{path.name} not a PNG"
            width = int.from_bytes(data[16:20], "big")  # IHDR width
            height = int.from_bytes(data[20:24], "big")  # IHDR height
            assert (width, height) == (300, 420), (
                f"{path.name} size {(width, height)} != 300x420"
            )
            assert path.stat().st_size <= 300 * 1024, f"{path.name} too large"


def test_card_back_exists_and_is_optimized() -> None:
    path = ASSET_DIR / "back.png"
    assert path.is_file()
    data = path.read_bytes()
    assert data.startswith(b"\x89PNG\r\n\x1a\n")
    width = int.from_bytes(data[16:20], "big")
    height = int.from_bytes(data[20:24], "big")
    assert (width, height) == (300, 420), f"back.png size {(width, height)} != 300x420"
    assert path.stat().st_size <= 300 * 1024, "back.png too large"


def test_no_unused_vector_duplicates_ship_in_the_bundle() -> None:
    """`public/` is copied verbatim into dist/ and the APK; the renderer only
    ever resolves .png, so a parallel SVG deck would be pure bundle weight."""
    assert list(ASSET_DIR.glob("*.svg")) == []


def test_cc0_license_bundled() -> None:
    license_file = ASSET_DIR / "OPEN_DECKS_LICENSE.txt"
    assert license_file.is_file()
    text = license_file.read_text(encoding="utf-8", errors="replace")
    assert "CC0" in text or "Creative Commons" in text


def test_importer_downsamples_what_it_installs() -> None:
    """Issue #6 regression: merge c7d5220 dropped the resize call from
    `import_deck`, so a re-import would reinstall the 1500x2100 raster and
    silently undo the optimization. Parsed from source because Pillow is not a
    backend dependency."""
    script = (
        Path(__file__).resolve().parents[2] / "scripts" / "import_opendecks_cards.py"
    )
    tree = ast.parse(script.read_text(encoding="utf-8"))
    functions = {n.name: n for n in tree.body if isinstance(n, ast.FunctionDef)}
    assert "_optimize_pngs" in functions, "importer has no downsampling helper"
    called = {
        n.func.id
        for n in ast.walk(functions["import_deck"])
        if isinstance(n, ast.Call) and isinstance(n.func, ast.Name)
    }
    assert "_optimize_pngs" in called, "import_deck installs PNGs without resizing"
    sizes = {
        (e.elts[0].value, e.elts[1].value)
        for e in ast.walk(functions["_optimize_pngs"])
        if isinstance(e, ast.Tuple)
        and len(e.elts) == 2
        and all(isinstance(x, ast.Constant) for x in e.elts)
    }
    assert sizes == {(300, 420)}, f"importer resizes to {sizes}, not 300x420"
