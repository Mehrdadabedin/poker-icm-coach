"""Make the narration WAVs for a demo video with a text-to-speech API.

Usage (from the repo root):
  uv run python scripts/demo-video/narrate.py SCENES_JSON LINES_DIR [ONLY_LINE]

Writes LINES_DIR/lineNN.wav for every scene line and then the end card line
(or only line ONLY_LINE, to try a voice cheaply). The provider comes from
"voice" in SCENES_JSON: "openrouter" (ElevenLabs voices, key in
OPENROUTER_API_KEY or ~/.config/icmbot/openrouter_key) or "openai" (key in
OPENAI_API_KEY or ~/.config/icmbot/openai_key). Keys are never printed or
written anywhere else. A line whose text and voice did not change since the
last run is not requested again, so re-running costs nothing.
"""
from __future__ import annotations

import hashlib
import json
import os
import sys
import urllib.error
import urllib.request
import wave
from pathlib import Path

CONFIG = Path.home() / ".config" / "icmbot"
PROVIDERS = {
    "openrouter": ("https://openrouter.ai/api/v1/audio/speech", "OPENROUTER_API_KEY", "openrouter_key"),
    "openai": ("https://api.openai.com/v1/audio/speech", "OPENAI_API_KEY", "openai_key"),
}
RATE = 24_000  # both answer raw 16-bit mono PCM at 24 kHz


def api_key(env_name: str, file_name: str) -> str:
    key = os.environ.get(env_name, "").strip()
    if not key and (CONFIG / file_name).is_file():
        key = (CONFIG / file_name).read_text().strip()
    if not key:
        sys.exit(f"No API key: set {env_name} or save it in {CONFIG / file_name}")
    return key


def speak(url: str, key: str, voice: dict[str, str], text: str) -> bytes:
    payload = {"model": voice["model"], "voice": voice["voice"], "input": text, "response_format": "pcm"}
    if voice.get("instructions"):
        payload["instructions"] = voice["instructions"]
    request = urllib.request.Request(
        url, data=json.dumps(payload).encode(), method="POST",
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            return response.read()
    except urllib.error.HTTPError as error:
        # the body is the provider's error message; it never contains the key
        sys.exit(f"text-to-speech failed ({error.code}): {error.read().decode()[:300]}")


def write_wav(path: Path, pcm: bytes) -> None:
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(pcm)


def main() -> None:
    if len(sys.argv) not in (3, 4):
        sys.exit(__doc__)
    spec = json.loads(Path(sys.argv[1]).read_text())
    out = Path(sys.argv[2])
    only = int(sys.argv[3]) if len(sys.argv) == 4 else None
    out.mkdir(parents=True, exist_ok=True)
    voice = spec["voice"]
    url, env_name, file_name = PROVIDERS[voice.get("provider", "openrouter")]
    lines = [scene["line"] for scene in spec["scenes"]] + [spec["endCard"]["line"]]
    key: str | None = None
    for i, text in enumerate(lines):
        if only is not None and i != only:
            continue
        stamp = hashlib.sha256(json.dumps([voice, text]).encode()).hexdigest()[:16]
        wav, tag = out / f"line{i:02d}.wav", out / f"line{i:02d}.tag"
        if wav.is_file() and tag.is_file() and tag.read_text() == stamp:
            print(f"line {i:02d}: unchanged")
            continue
        key = key or api_key(env_name, file_name)
        write_wav(wav, speak(url, key, voice, text))
        tag.write_text(stamp)
        print(f"line {i:02d}: {len(text.split())} words")


if __name__ == "__main__":
    main()
