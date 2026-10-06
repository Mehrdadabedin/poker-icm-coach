/**
 * encode.mjs — poster + H.264 MP4 with burned-in caption overlays (A48).
 *
 * Usage: node encode.mjs <workDir> <output.mp4> <poster.webp>
 * workDir holds the source webm (last *.webm), captions.json and the
 * per-scene caption PNGs (cap-00.png ...). The static ffmpeg build used by
 * imageio-ffmpeg has no drawtext, so the captions are rendered by the
 * recorder in Playwright (transparent PNGs) and composited here with the
 * overlay filter (enable=between per scene). Re-encodes with a higher CRF
 * until the MP4 is under 10 MB, then extracts the champion scene as the
 * WebP poster. Prints duration and file size at the end.
 */
import { spawn } from "node:child_process";
import fs from "node:fs";

const [, , workDir, output, poster] = process.argv;
const ffmpeg = process.env.FFMPEG_BIN ?? "ffmpeg";
const SIZE_LIMIT = 10 * 1024 * 1024;
const input = fs.readdirSync(workDir).map((name) => `${workDir}/${name}`).find((path) => path.endsWith(".webm"));
if (!input) {
  console.error(`no webm found in ${workDir}`);
  process.exit(2);
}

function run(args) {
  return new Promise((resolve) => {
    const child = spawn(ffmpeg, args, { stdio: ["ignore", "pipe", "pipe"] });
    const err = [];
    child.stderr.on("data", (b) => { err.push(b); });
    child.on("exit", (code) => resolve({ code: code ?? 0, err: Buffer.concat(err).toString() }));
  });
}

function durationOf() {
  return run(["-i", input]).then(({ err }) => {
    const m = err.match(/Duration: (\d+):(\d+):(\d+(?:\.\d+)?)/);
    return m ? Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) : 0;
  });
}

// The Playwright webm begins with ~2s of blank white frames before the page
// paints; trim them and shift the captions to stay in sync.
const TRIM = Number(process.env.PROMO_TRIM ?? "3.0");
const data = JSON.parse(fs.readFileSync(`${workDir}/captions.json`, "utf8"));
const rawTotal = data.duration ?? (await durationOf());
const total = Math.max(0, rawTotal - TRIM);
const shift = (value) => Math.max(0, value - TRIM);
const captions = (data.captions ?? [])
  .filter((c) => shift(c.start) < total - 0.4)
  .map((c, i) => ({
    text: c.text,
    start: shift(c.start),
    end: Math.min(shift(c.end), total - 0.3),
    img: `${workDir}/captions/cap-${String(i).padStart(2, "0")}.png`,
  }));

const chain = [];
let previous = "0:v";
captions.forEach((c, i) => {
  const next = `v${i + 1}`;
  chain.push(
    `[${previous}][${i + 1}:v]overlay=x=(W-w)/2:y=H-150:` +
    `enable='between(t,${c.start.toFixed(2)},${c.end.toFixed(2)})'[${next}]`,
  );
  previous = next;
});
const filter = chain.join(";");

let crf = 26;
let size = Number.MAX_SAFE_INTEGER;
let ended = null;
for (let attempt = 0; attempt < 4; attempt++) {
  const inputs = [input, ...captions.map((c) => c.img)].map((path) => ["-i", path]).flat();
  ended = await run([
    "-loglevel", "error", "-stats", "-y", ...inputs,
    "-filter_complex", filter,
    "-map", `[${previous}]`,
    "-ss", String(TRIM),
    "-an", "-c:v", "libx264", "-preset", "slow", "-crf", String(crf),
    "-pix_fmt", "yuv420p", "-movflags", "+faststart", output,
  ]);
  size = fs.existsSync(output) ? fs.statSync(output).size : Number.MAX_SAFE_INTEGER;
  if (size < SIZE_LIMIT) break;
  crf += 4;
}
if (size >= SIZE_LIMIT || !fs.existsSync(output)) {
  console.error(ended.err.slice(-1200));
  process.exit(3);
}

const championIndex = captions.findIndex((c) => c.text.includes("PLAY YOUR FIRST")) ?? 0;
const posterAt = Math.max(0, Math.min(total - 2, (captions[Math.max(0, championIndex)]?.start ?? total * 0.6) - 1)) + TRIM;
const posterPng = poster.replace(/\.webp$/, ".png");
await run(["-loglevel", "error", "-y", "-ss", String(posterAt), "-i", input, "-frames:v", "1", posterPng]);
await run(["-loglevel", "error", "-y", "-i", posterPng, "-c:v", "libwebp", "-quality", "82", poster]);
fs.unlinkSync(posterPng);

const posterSize = fs.statSync(poster).size;
const minutes = Math.floor(total / 60);
const seconds = Math.round(total % 60);
console.log(
  `promo ready: ${Math.round(size / 1024)} KB (limit 10240), ` +
  `duration ${minutes}:${String(seconds).padStart(2, "0")}, ${captions.length} captions, poster ${Math.round(posterSize / 1024)} KB`,
);
process.exit(0);
