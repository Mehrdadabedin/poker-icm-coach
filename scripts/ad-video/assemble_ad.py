"""Cut the ad takes into shots, lay the text layers over them and encode the MP4.

Usage (from the repo root):
  uv run --with imageio-ffmpeg python scripts/ad-video/assemble_ad.py \
      SHOTS_JSON TAKES_DIR OVERLAY_DIR OUT_MP4 [MUSIC_FILE MUSIC_START_SECONDS]

TAKES_DIR holds one folder per take (frames/, frames.json, marks.json from
takes.mjs); OVERLAY_DIR holds popNN.png and end.png from overlays.mjs.
A mark that appears more than once (a retried champion run) uses its last
occurrence. The footage fills the whole frame. OUT_MP4 gets the music (from MUSIC_START_SECONDS, faded
out over the last 1.5 s, loudness -16 LUFS); OUT_MP4 with _silent before .mp4 is always written with
a silent AAC track, for platforms that need their own music. Without a music file OUT_MP4 is silent too.
"""
from __future__ import annotations

import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

import imageio_ffmpeg

FF = imageio_ffmpeg.get_ffmpeg_exe()
FPS = 30
POP_FADE = 0.15
FADE_OUT = 1.5
LUFS = -16
X264 = ["-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p", "-r", str(FPS)]


def ff(*args: str) -> None:
    subprocess.run([FF, "-hide_banner", "-loglevel", "error", "-y", *args], check=True)


def take_data(root: Path, name: str) -> tuple[list[tuple[str, float]], dict[str, float]]:
    take = root / name
    stamps = [(f, float(t)) for f, t in json.loads((take / "frames.json").read_text())]
    marks = {m["name"]: m["t"] for m in json.loads((take / "marks.json").read_text())}
    return stamps, marks


def frame_list(root: Path, name: str, start: float, length: float, out: Path) -> None:
    """A concat-demuxer list of the take's frames in [start, start+length)."""
    stamps, _ = take_data(root, name)
    end = start + length
    inside = [(f, t) for f, t in stamps if start <= t < end] or [stamps[-1]]
    lines = []
    for (f, t), nxt in zip(inside, [*inside[1:], (None, end)], strict=True):
        lines.append(f"file '{root / name / 'frames' / f}'\nduration {max(nxt[1] - t, 0.001):.4f}")
    lines.append(f"file '{root / name / 'frames' / inside[-1][0]}'")
    out.write_text("\n".join(lines) + "\n")


def encode_shot(root: Path, ov: Path, shot: dict, i: int, work: Path) -> Path:
    _, marks = take_data(root, shot["take"])
    name, offset = shot["from"]
    if name not in marks:
        sys.exit(f"mark {name!r} is not in the {shot['take']} take")
    start, length = max(marks[name] + offset, 0.0), float(shot["dur"])
    listing = work / f"f{i:02d}.txt"
    frame_list(root, shot["take"], start, length, listing)
    out = work / f"s{i:02d}.mp4"
    graph = (
        f"[0:v]scale=1080:1920:flags=lanczos,fps={FPS},tpad=stop_mode=clone:stop_duration={length}[b];"
        f"[1:v]format=rgba,fade=in:st=0:d={POP_FADE}:alpha=1[p];[b][p]overlay=0:0,format=yuv420p[v]"
    )
    ff("-f", "concat", "-safe", "0", "-i", str(listing),
       "-loop", "1", "-framerate", str(FPS), "-i", str(ov / f"pop{i:02d}.png"),
       "-filter_complex", graph, "-map", "[v]", "-t", f"{length:.3f}", *X264, str(out))
    return out


def end_card(ov: Path, seconds: float, out: Path) -> None:
    ff("-loop", "1", "-framerate", str(FPS), "-i", str(ov / "end.png"), "-t", f"{seconds:.3f}",
       "-vf", f"fade=t=in:st=0:d=0.3,format=yuv420p", *X264, str(out))


def duration(path: Path) -> float:
    err = subprocess.run([FF, "-hide_banner", "-i", str(path)], capture_output=True, text=True, check=False).stderr
    h, m, sec = re.search(r"Duration: (\d+):(\d+):([\d.]+)", err).groups()
    return int(h) * 3600 + int(m) * 60 + float(sec)


def with_audio(silent: Path, out: Path, music: tuple[Path, float] | None) -> None:
    if music is None:
        source, audio = ["-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo"], []
    else:
        length = duration(silent)
        source = ["-ss", f"{music[1]:.3f}", "-t", f"{length:.3f}", "-i", str(music[0])]
        audio = ["-af", f"loudnorm=I={LUFS}:TP=-1.5:LRA=11,afade=t=out:st={length - FADE_OUT:.3f}:d={FADE_OUT},aresample=48000"]
    ff("-i", str(silent), *source, "-map", "0:v", "-map", "1:a", *audio, "-c:v", "copy",
       "-c:a", "aac", "-b:a", "128k", "-shortest", "-movflags", "+faststart", str(out))


def main() -> None:
    if len(sys.argv) not in (5, 7):
        sys.exit(__doc__)
    spec_path, root, ov, out_mp4 = (Path(a) for a in sys.argv[1:5])
    music = (Path(sys.argv[5]), float(sys.argv[6])) if len(sys.argv) == 7 else None
    spec = json.loads(spec_path.read_text())
    work = Path(tempfile.mkdtemp(prefix="ad-video-"))
    parts = [encode_shot(root, ov, shot, i, work) for i, shot in enumerate(spec["shots"])]
    end = work / "end.mp4"
    end_card(ov, float(spec["end"]["seconds"]), end)
    parts.append(end)
    listing = work / "all.txt"
    listing.write_text("".join(f"file '{p}'\n" for p in parts))
    joined = work / "joined.mp4"
    ff("-f", "concat", "-safe", "0", "-i", str(listing), "-c", "copy", str(joined))
    silent = out_mp4.with_name(out_mp4.stem + "_silent.mp4")
    with_audio(joined, silent, None)
    with_audio(joined, out_mp4, music)
    for f in (out_mp4, silent):
        print(f"{f}: {f.stat().st_size / 1e6:.1f} MB")


if __name__ == "__main__":
    main()
