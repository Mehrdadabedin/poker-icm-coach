/**
 * encode.mjs — assemble the narrated promo (A48).
 *
 * Usage: node encode.mjs <workDir> <output.mp4> <poster.webp>
 * Reads marks.json (scene marks, narration lines with durations, voice),
 * probes the webm's blank white lead-in, then in ONE ffmpeg pass:
 *  - trims the lead,
 *  - overlays the Playwright-rendered caption PNGs (one caption at a time,
 *    exactly at its scene mark, for the narration line's duration),
 *  - delays and mixes the per-scene piper WAVs onto those marks,
 *  - loudness-normalises ~-16 LUFS and encodes AAC 128 kbps,
 *  - H.264 video with a CRF-reencode loop until the MP4 is under 10 MB.
 * Finally extracts the champion frame as the WebP poster and prints duration,
 * size and the used voice.
 */
import { spawn } from "node:child_process";
import fs from "node:fs";

const [, , workDir, output, poster] = process.argv;
const ffmpeg = process.env.FFMPEG_BIN ?? "ffmpeg";
const SIZE_LIMIT = 10 * 1024 * 1024;
const input = fs.readdirSync(workDir).map((n) => `${workDir}/${n}`).find((p) => p.endsWith(".webm"));
const marksData = JSON.parse(fs.readFileSync(`${workDir}/marks.json`, "utf8"));
if (!input) { console.error(`no webm in ${workDir}`); process.exit(2); }

function run(args) {
  return new Promise((resolve) => {
    const child = spawn(ffmpeg, args, { stdio: ["ignore", "pipe", "pipe"] });
    const out = [];
    const err = [];
    child.stdout.on("data", (b) => { out.push(b); });
    child.stderr.on("data", (b) => { err.push(b); });
    child.on("exit", (code) => resolve({
      code: code ?? 0,
      out: Buffer.concat(out),
      err: Buffer.concat(err).toString(),
    }));
  });
}

async function probeTrim() {
  // Sample 1 frame every 0.2s for the first 8s as 16x9 gray raw bytes and
  // find the first dark (content) frame; the lead-in is a bright blank page.
  const res = await run([
    "-loglevel", "error", "-i", input,
    "-vf", "scale=16:9,format=gray", "-r", "5", "-t", "8", "-f", "rawvideo", "pipe:1",
  ]);
  const bytes = res.out;
  const perFrame = 16 * 9;
  let trim = 2.2; // measured fallback
  if (bytes.length >= perFrame) {
    for (let i = 0; i * perFrame + perFrame <= bytes.length; i++) {
      let sum = 0;
      for (let j = 0; j < perFrame; j += 4) sum += bytes[i * perFrame + j];
      const mean = sum / (perFrame / 4);
      if (mean < 110) {
        trim = i * 0.2;
        break;
      }
    }
  }
  console.error(`probeTrim=${trim.toFixed(2)}`);
  return Math.max(0, Math.min(trim, 3.5));
}

const trim = await probeTrim();
const marks = marksData.marks;
const heroAt = marks.hero ?? 0;
const lines = marksData.lines;
const cue = (id) => trim + (marks[id] - heroAt) + 0.45;
const cues = lines.map((line) => ({
  id: line.id,
  text: line.line,
  dur: line.dur ?? 3,
  at: cue(line.id),
}));
const total = cues.length ? cues.reduce((max, c) => Math.max(max, c.at + c.dur), 0) + 1.5 : 1;
const totalSec = Math.max(total, 1);

// video chain: strip the blank lead inside the graph (an output -ss would
// also shift the delayed audio), then overlay one caption at a time at its
// scene mark for exactly the narration line's duration.
const chain = [`[0:v]trim=start=${trim.toFixed(2)},setpts=PTS-STARTPTS[vpre]`];
let previous = "vpre";
cues.forEach((c, i) => {
  const next = `v${i + 1}`;
  const end = c.at + c.dur + 0.35;
  chain.push(
    `[${previous}][${i + 1}:v]overlay=x=(W-w)/2:y=H-150:` +
    `enable='between(t,${c.at.toFixed(2)},${end.toFixed(2)})'[${next}]`,
  );
  previous = next;
});
const last = cues.length ? `v${cues.length}` : "vpre";
const videoFilter = [...chain, `[${last}]tpad=stop_mode=clone:stop_duration=4[vtpad]`].join(";");

// audio: per-scene WAV delayed to its cue, mixed, normalised
const audioFilter = cues
  .map((c, i) => {
    const ms = Math.max(0, Math.round(c.at * 1000));
    return `[${7 + i}:a]aresample=48000,pan=stereo|c0=c0|c1=c0,adelay=${ms}|${ms}[a${i}]`;
  })
  .join(";") + `;${cues.map((_, i) => `[a${i}]`).join("")}amix=inputs=${cues.length}:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=11[aout]`;

const captionInputs = cues.map((_, i) => [`-i`, `${workDir}/captions/cap-${String(i).padStart(2, "0")}.png`]).flat();
const audioInputs = cues.map((c) => [`-i`, `${workDir}/narration/${c.id}.wav`]).flat();

let size = Number.MAX_SAFE_INTEGER;
let crf = 26;
let result = null;
for (let attempt = 0; attempt < 4; attempt++) {
  const decap = output.replace(/\.mp4$/, "-video.mp4");
  result = await run([
    "-loglevel", "error", "-stats", "-y", "-i", input, ...captionInputs, ...audioInputs,
    "-filter_complex", `${videoFilter};${audioFilter}`,
    "-map", "[vtpad]", "-map", "[aout]",
    "-t", String(totalSec),
    "-c:v", "libx264", "-preset", "slow", "-crf", String(crf), "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "128k",
    "-movflags", "+faststart", decap,
  ]);
  size = fs.existsSync(decap) ? fs.statSync(decap).size : Number.MAX_SAFE_INTEGER;
  if (size < SIZE_LIMIT && result.code === 0) {
    fs.renameSync(decap, output);
    break;
  }
  fs.rmSync(decap, { force: true });
  crf += 6;
}
if (size >= SIZE_LIMIT || !fs.existsSync(output)) {
  console.error(result.err.slice(-1500));
  process.exit(3);
}

const champion = cues.find((c) => c.id === "champion");
const posterAt = Math.max(0, (champion ? champion.at : totalSec * 0.7) - 0.9 + trim);
const posterPng = poster.replace(/\.webp$/, ".png");
await run(["-loglevel", "error", "-y", "-ss", String(posterAt), "-i", input, "-frames:v", "1", posterPng]);
await run(["-loglevel", "error", "-y", "-i", posterPng, "-c:v", "libwebp", "-quality", "82", poster]);
fs.rmSync(posterPng, { force: true });

const sizeKb = Math.round(fs.statSync(output).size / 1024);
const minutes = Math.floor(totalSec / 60);
const seconds = Math.round(totalSec % 60);
console.log(
  `promo ready: ${sizeKb} KB (limit 10240), duration ${minutes}:${String(seconds).padStart(2, "0")}, ` +
  `${cues.length} captions, poster ${Math.round(fs.statSync(poster).size / 1024)} KB, voice ${marksData.voice}`,
);
process.exit(0);
