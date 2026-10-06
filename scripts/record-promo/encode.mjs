/**
 * encode.mjs — assemble the narrated promo (A48, fixed).
 *
 * Usage: node encode.mjs <workDir> <output.mp4> <poster.webp>
 * The webm is the NATIVE 1280x720 recording; the video chain trims the blank
 * lead, resets the timestamps, upscales to 1920x1080 (lanczos) and only then
 * overlays the caption PNGs (one part at a time, at its scene mark). The
 * cue time is (mark - heroMark) + 0.45 in the POST-TRIM timeline, so the
 * trim is not counted twice. Caption pages are 1920x220 and sit at
 * y = H - h - 40. The per-scene piper WAVs are delayed onto the same cues,
 * mixed, loudnorm'd ~-16 LUFS and resampled back to 48 kHz (AAC 128k).
 * The poster is extracted from the SCALED stream. A CRF loop keeps the MP4
 * under 10 MB. Prints duration, size and the voice at the end.
 */
import { spawn } from "node:child_process";
import fs from "node:fs";

const [, , workDir, output, poster] = process.argv;
const ffmpeg = process.env.FFMPEG_BIN ?? "ffmpeg";
const SIZE_LIMIT = 10 * 1024 * 1024;
const input = fs.readdirSync(workDir).map((n) => `${workDir}/${n}`).find((p) => p.endsWith(".webm"));
const marksData = JSON.parse(fs.readFileSync(`${workDir}/marks.json`, "utf8"));
const captionData = JSON.parse(fs.readFileSync(`${workDir}/captions.json`, "utf8"));
if (!input) { console.error(`no webm in ${workDir}`); process.exit(2); }

function run(args) {
  return new Promise((resolve) => {
    const child = spawn(ffmpeg, args, { stdio: ["ignore", "pipe", "pipe"] });
    const out = [];
    const err = [];
    child.stdout.on("data", (b) => { out.push(b); });
    child.stderr.on("data", (b) => { err.push(b); });
    child.on("exit", (code) => resolve({
      code: code ?? 0, out: Buffer.concat(out), err: Buffer.concat(err).toString(),
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
  let trim = 2.4; // measured fallback
  if (bytes.length >= perFrame) {
    for (let i = 0; i * perFrame + perFrame <= bytes.length; i += 1) {
      let sum = 0;
      for (let j = 0; j < perFrame; j += 4) sum += bytes[i * perFrame + j];
      if (sum / (perFrame / 4) < 110) {
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
// Cues live in the POST-TRIM video timeline: the trim filter already reset
// the timestamps, so adding trim again would delay everything by ~2.4s.
const cue = (id) => (marks[id] - heroAt) + 0.45;
const cues = captionData.cues.map((entry) => ({
  id: entry.id,
  dur: entry.dur,
  at: cue(entry.id),
  parts: entry.parts.map((p) => ({
    ...p,
    file: p.file,
    start: cue(entry.id) + p.frac0 * entry.dur + 0.1,
    end: cue(entry.id) + p.frac1 * entry.dur - 0.05,
  })),
}));
const allParts = cues.flatMap((c) => c.parts);
const total = cues.length ? cues.reduce((max, c) => Math.max(max, c.at + c.dur), 0) + 1.5 : 1;
const totalSec = Math.max(total, 1);

// video chain: blank-lead trim -> t=0 -> 1920x1080 lanczos -> caption parts
const chain = [
  `[0:v]trim=start=${trim.toFixed(2)},setpts=PTS-STARTPTS,scale=1920:1080:flags=lanczos[vpre]`,
];
let previous = "vpre";
allParts.forEach((part, i) => {
  const next = `p${i + 1}`;
  chain.push(
    `[${previous}][${i + 1}:v]overlay=x=(W-w)/2:y=H-h-40:` +
    `enable='between(t,${part.start.toFixed(2)},${part.end.toFixed(2)})'[${next}]`,
  );
  previous = next;
});
const lastPart = allParts.length ? `p${allParts.length}` : "vpre";
const videoFilter = [...chain, `[${lastPart}]tpad=stop_mode=clone:stop_duration=4[vtpad]`].join(";");

// audio: each scene WAV delayed to its cue, mixed, loudnorm, back to 48kHz
const audioFilter = cues
  .map((c, i) => {
    const ms = Math.max(0, Math.round(c.at * 1000));
    return `[${1 + allParts.length + i}:a]aresample=48000,pan=stereo|c0=c0|c1=c0,adelay=${ms}|${ms}[a${i}]`;
  })
  .join(";") +
  `;${cues.map((_, i) => `[a${i}]`).join("")}amix=inputs=${cues.length}:normalize=0,` +
  `loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000[aout]`;

const captionInputs = allParts.map((p) => ["-i", `${workDir}/captions/${p.file}`]).flat();
const audioInputs = cues.map((c) => ["-i", `${workDir}/narration/${c.id}.wav`]).flat();

let size = Number.MAX_SAFE_INTEGER;
let crf = 26;
let result = null;
for (let attempt = 0; attempt < 4; attempt += 1) {
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

// Poster from the SCALED stream (the raw webm is 1280x720).
const champion = cues.find((c) => c.id === "champion");
const posterAt = Math.max(0, (champion ? champion.at : totalSec * 0.7) - 0.9);
const posterPng = poster.replace(/\.webp$/, ".png");
await run([
  "-loglevel", "error", "-y", "-ss", String(posterAt + trim), "-i", input,
  "-vf", "scale=1920:1080:flags=lanczos", "-frames:v", "1", posterPng,
]);
await run(["-loglevel", "error", "-y", "-i", posterPng, "-c:v", "libwebp", "-quality", "82", poster]);
fs.rmSync(posterPng, { force: true });

const sizeKb = Math.round(fs.statSync(output).size / 1024);
const minutes = Math.floor(totalSec / 60);
const seconds = Math.round(totalSec % 60);
console.log(
  `promo ready: ${sizeKb} KB (limit 10240), duration ${minutes}:${String(seconds).padStart(2, "0")}, ` +
  `${cues.length} scenes / ${allParts.length} caption parts, poster ${Math.round(fs.statSync(poster).size / 1024)} KB, voice ${marksData.voice}`,
);
process.exit(0);
