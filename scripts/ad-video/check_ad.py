"""Check the finished ad against its brief (plan 098).

Usage: uv run --with imageio-ffmpeg python scripts/ad-video/check_ad.py AD_MP4
Size under 15 MB, 1080x1920, 28 to 32 s, 30 fps, H.264 video, AAC audio. With
sound the loudness must be -17 to -15 LUFS; a silent track passes without it.
"""
from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

import imageio_ffmpeg

FF = imageio_ffmpeg.get_ffmpeg_exe()


def ffmpeg_report(path: Path, *extra: str) -> str:
    run = subprocess.run([FF, "-hide_banner", "-i", str(path), *extra, "-f", "null", "-"],
                         capture_output=True, text=True, check=False)
    return run.stderr


def main() -> None:
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    path = Path(sys.argv[1])
    info = ffmpeg_report(path, "-af", "ebur128")
    seconds = re.search(r"Duration: (\d+):(\d+):([\d.]+)", info)
    video = re.search(r"Video: (\w+).*?, (\d+)x(\d+).*?, ([\d.]+) fps", info)
    audio = re.search(r"Audio: (\w+)", info)
    loud = re.findall(r"I:\s+(-?[\d.]+|-inf) LUFS", info)
    assert seconds and video and audio, "no video or audio stream found"
    length = int(seconds[1]) * 3600 + int(seconds[2]) * 60 + float(seconds[3])
    size_mb = path.stat().st_size / 1e6
    lufs = float(loud[-1]) if loud and loud[-1] != "-inf" else None
    silent = lufs is None or lufs < -60
    checks = {
        f"size {size_mb:.1f} MB (under 15)": size_mb < 15,
        f"frame {video[2]}x{video[3]} (1080x1920)": (video[2], video[3]) == ("1080", "1920"),
        f"length {length:.1f} s (28 to 32)": 28 <= length <= 32,
        f"frame rate {video[4]} fps (30)": abs(float(video[4]) - 30) < 0.5,
        f"codecs {video[1]} + {audio[1]} (h264 + aac)": (video[1], audio[1]) == ("h264", "aac"),
        "audio " + ("silent track (no music chosen yet)" if silent else f"{lufs} LUFS (-17 to -15)"):
            silent or -17 <= float(lufs or 0) <= -15,
    }
    for text, ok in checks.items():
        print("PASS" if ok else "FAIL", text)
    sys.exit(0 if all(checks.values()) else 1)


if __name__ == "__main__":
    main()
