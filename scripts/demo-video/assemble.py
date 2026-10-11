"""Cut a recorded demo into scenes timed to their narration, and encode it.

Usage (from the repo root):
  uv run --with imageio-ffmpeg python scripts/demo-video/assemble.py \
      SCENES_JSON TAKE_DIR LINES_DIR OUT_MP4

TAKE_DIR holds the Playwright .webm and marks.json written by record_demo.mjs.
LINES_DIR holds lineNN.wav from narrate.py, plus endcard.png from
endcard.mjs. A missing line becomes silence as long as the words would take,
so a silent preview cut works before any voice exists.

Each scene lasts as long as its line plus a short gap: a longer recording is
sped up (at most MAX_SPEED), a shorter one holds its last frame.
"""
from __future__ import annotations

import json
import subprocess
import sys
import tempfile
import wave
from pathlib import Path

import imageio_ffmpeg

FF = imageio_ffmpeg.get_ffmpeg_exe()
FPS = 25
MAX_SPEED = 2.0
LEAD = 0.15  # silence before a line
GAP = 0.45  # silence after a line
WORDS_PER_SECOND = 2.6  # silent-preview estimate
END_HOLD = 1.2  # end card stays after its line


def ff(*args: str) -> None:
    subprocess.run([FF, "-hide_banner", "-loglevel", "error", "-y", *args], check=True)


def mark_time(marks: dict[str, float], ref: list[str | float]) -> float:
    name, offset = str(ref[0]), float(ref[1])
    if name not in marks:
        sys.exit(f"mark {name!r} is not in marks.json; was the take complete?")
    return marks[name] + offset


def line_audio(src: Path, text: str, out: Path) -> float:
    """48 kHz stereo WAV of one line; returns its length in seconds."""
    if src.is_file():
        ff("-i", str(src), "-ar", "48000", "-ac", "2", str(out))
    else:
        seconds = max(1.0, len(text.split()) / WORDS_PER_SECOND)
        ff("-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo", "-t", f"{seconds:.3f}", str(out))
    with wave.open(str(out)) as w:
        return w.getnframes() / w.getframerate()


def scene_audio(line_wav: Path, length: float, out: Path) -> None:
    lead_ms = int(LEAD * 1000)
    ff("-i", str(line_wav), "-af", f"adelay={lead_ms}:all=1,apad,atrim=0:{length:.3f}",
       "-ar", "48000", "-ac", "2", str(out))


def scene_video(take: Path, start: float, end: float, length: float, out: Path) -> float:
    """Encode one scene of exactly `length` seconds; returns the speed used."""
    source = end - start
    speed = min(max(source / length, 1.0), MAX_SPEED)
    hold = max(0.0, length - source / speed)
    filters = f"setpts=(PTS-STARTPTS)/{speed:.4f},fps={FPS},tpad=stop_mode=clone:stop_duration={hold:.3f}"
    ff("-ss", f"{start:.3f}", "-to", f"{end:.3f}", "-i", str(take), "-an", "-vf",
       f"{filters},scale=1920:1080,format=yuv420p", "-t", f"{length:.3f}",
       "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-r", str(FPS), str(out))
    return speed


def card_video(image: Path, length: float, out: Path) -> None:
    fade_out = max(0.0, length - 0.6)
    ff("-loop", "1", "-i", str(image), "-t", f"{length:.3f}", "-vf",
       f"scale=1920:1080,fade=t=in:st=0:d=0.4,fade=t=out:st={fade_out:.3f}:d=0.6,format=yuv420p",
       "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-r", str(FPS), str(out))


def concat(parts: list[Path], out: Path, work: Path, copy: bool) -> None:
    listing = work / f"{out.stem}.txt"
    listing.write_text("".join(f"file '{p}'\n" for p in parts))
    codec = ["-c", "copy"] if copy else []
    ff("-f", "concat", "-safe", "0", "-i", str(listing), *codec, str(out))


def main() -> None:
    if len(sys.argv) != 5:
        sys.exit(__doc__)
    spec_path, take_dir, lines_dir, out_mp4 = (Path(a) for a in sys.argv[1:])
    spec = json.loads(spec_path.read_text())
    marks = {m["name"]: m["t"] for m in reversed(json.loads((take_dir / "marks.json").read_text()))}
    take = next(take_dir.glob("*.webm"))
    work = Path(tempfile.mkdtemp(prefix="demo-video-"))
    videos: list[Path] = []
    audios: list[Path] = []
    total = 0.0
    for i, scene in enumerate(spec["scenes"]):
        line = line_audio(lines_dir / f"line{i:02d}.wav", scene["line"], work / f"l{i:02d}.wav")
        start, end = mark_time(marks, scene["from"]), mark_time(marks, scene["to"])
        # never cut a scene short: a long one at top speed outlasts its line
        length = max(LEAD + line + GAP, (end - start) / MAX_SPEED)
        speed = scene_video(take, start, end, length, work / f"v{i:02d}.mp4")
        scene_audio(work / f"l{i:02d}.wav", length, work / f"a{i:02d}.wav")
        videos.append(work / f"v{i:02d}.mp4")
        audios.append(work / f"a{i:02d}.wav")
        total += length
        print(f"scene {i:02d}: {length:5.2f}s  source {end - start:5.2f}s  speed {speed:.2f}x")
    end_card = spec["endCard"]
    n = len(spec["scenes"])
    line = line_audio(lines_dir / f"line{n:02d}.wav", end_card["line"], work / f"l{n:02d}.wav")
    length = LEAD + line + END_HOLD
    card = lines_dir / "endcard.png"
    card_video(card if card.is_file() else Path(end_card["image"]), length, work / f"v{n:02d}.mp4")
    scene_audio(work / f"l{n:02d}.wav", length, work / f"a{n:02d}.wav")
    videos.append(work / f"v{n:02d}.mp4")
    audios.append(work / f"a{n:02d}.wav")
    total += length
    concat(videos, work / "video.mp4", work, copy=True)
    concat(audios, work / "audio.wav", work, copy=False)
    ff("-i", str(work / "video.mp4"), "-i", str(work / "audio.wav"), "-c:v", "copy",
       "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-ar", "48000", "-c:a", "aac", "-b:a", "128k",
       "-shortest", "-movflags", "+faststart", str(out_mp4))
    size_mb = Path(out_mp4).stat().st_size / 1_000_000
    print(f"end card: {length:5.2f}s\n{out_mp4}: {total:.1f}s, {size_mb:.1f} MB")


if __name__ == "__main__":
    main()
