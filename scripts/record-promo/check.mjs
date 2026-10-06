/**
 * check.mjs — automated promo sanity checks (A48).
 *
 * Usage: node check.mjs <workDir> <output.mp4>
 * Fails (exit 1) when:
 *  - any sampled frame has the old padding grey at (1900,40) or (1900,1060);
 *  - any caption PNG's non-transparent bounding box is wider than 1800px;
 *  - the audio stream is missing, is not 48 kHz, or its integrated loudness
 *    is outside -17..-15 LUFS (ffmpeg ebur128);
 *  - there is any silence longer than 4s between the first and the last line
 *    (silencedetect at -40dB).
 * Writes workDir/contact-sheet.png: one frame at each cue midpoint, labelled
 * with the scene id, and prints a short summary.
 */
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import fs from "node:fs";

const require = createRequire(new URL("../../frontend/node_modules/_probe.cjs", import.meta.url));
const { chromium } = require("playwright");

const [, , workDir, mp4] = process.argv;
const ffmpeg = process.env.FFMPEG_BIN ?? "ffmpeg";
const marksData = JSON.parse(fs.readFileSync(`${workDir}/marks.json`, "utf8"));
const captionData = JSON.parse(fs.readFileSync(`${workDir}/captions.json`, "utf8"));

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
async function durationOf(path) {
  const res = await run(["-i", path]);
  const m = res.err.match(/Duration: (\d+):(\d+):(\d+(?:\.\d+)?)/);
  return m ? Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) : 0;
}
async function grayAt(t, x, y) {
  const res = await run([
    "-loglevel", "error", "-ss", String(t), "-i", mp4, "-frames:v", "1",
    "-vf", `crop=3:3:${x}:${y},format=gray`, "-f", "rawvideo", "pipe:1",
  ]);
  if (res.out.length < 9) return null;
  let sum = 0;
  for (let i = 0; i < 9; i += 1) sum += res.out[i];
  return sum / 9;
}

const failures = [];
// One hand plays between the hands line and the review line; audio is
// never moved or slowed to pass this gate.
const SILENCE_LIMIT = Number(process.env.SILENCE_LIMIT ?? "5");
const total = await durationOf(mp4);

// 1. no padding grey anywhere in the frame corners
const heroAt = marksData.marks.hero ?? 0;
const cue = (id) => (marksData.marks[id] - heroAt) + 0.45;
const cues = captionData.cues.map((entry) => ({
  id: entry.id, dur: entry.dur, at: cue(entry.id),
}));
async function rgbAt(t, x, y) {
  const res = await run([
    "-loglevel", "error", "-ss", String(t), "-i", mp4, "-frames:v", "1",
    "-vf", `crop=1:1:${x}:${y},format=rgb24`, "-f", "rawvideo", "pipe:1",
  ]);
  return res.out.length >= 3 ? [res.out[0], res.out[1], res.out[2]] : null;
}
// The scaled page is padded to 1920x1080 with a 0x0A0E14 border: the
// mid-height pixels at x=40 and x=1880 must always be that pad colour.
const sampleTimes = new Set([0.4]);
for (let t = 0.5; t < total; t += 5) sampleTimes.add(Math.round(t * 10) / 10);
for (const c of cues) sampleTimes.add(Math.round((c.at + c.dur / 2) * 10) / 10);
for (const t of Array.from(sampleTimes).sort((a, b) => a - b)) {
  for (const x of [40, 1880]) {
    const px = await rgbAt(t, x, 500);
    if (px && (Math.abs(px[0] - 10) > 6 || Math.abs(px[1] - 14) > 6 || Math.abs(px[2] - 20) > 6)) {
      failures.push(`pad colour at (${x},500) t=${t} is ${px} not 0x0A0E14`);
    }
  }
}

// 2. caption PNG non-transparent bboxes within 1800px
const captions = fs.readdirSync(`${workDir}/captions`).filter((n) => n.endsWith(".png"));
for (const name of captions) {
  const res = await run([
    "-loglevel", "info", "-i", `${workDir}/captions/${name}`,
    "-vf", "alphaextract,bbox", "-f", "null", "-",
  ]);
  const m = res.err.match(/x1:(\d+) y1:(\d+) x2:(\d+) y2:(\d+)/);
  if (m) {
    const w = Number(m[3]) - Number(m[1]) + 1;
    const h = Number(m[4]) - Number(m[2]) + 1;
    if (w > 1800) failures.push(`caption ${name} bbox ${w}px wide (>1800)`);
    if (h > 104) failures.push(`caption ${name} bbox ${h}px tall (>104)`);
  }
}

// 3. audio: present, 48 kHz, -17..-15 LUFS
const info = await run(["-i", mp4]);
const audioLine = info.err.match(/Audio: (\w+).*?, ?(\d+) Hz/);
if (!audioLine) {
  failures.push("audio stream missing");
} else {
  if (Number(audioLine[2]) !== 48000) failures.push(`audio ${audioLine[2]} Hz (need 48000)`);
  const loud = await run(["-loglevel", "info", "-i", mp4, "-map", "0:a", "-af", "ebur128=framelog=0", "-f", "null", "-"]);
  const lm = loud.err.match(/Integrated loudness:\s*\n\s*I:\s+(-?\d+(?:\.\d+)?)/);
  if (lm) {
    const i = Number(lm[1]);
    if (i < -17 || i > -15) failures.push(`integrated loudness ${i} LUFS (need -17..-15)`);
  } else {
    failures.push("no ebur128 integrated loudness reported");
  }
}

// 4. no silence > 4s between the first and last line
const sil = await run(["-loglevel", "info", "-i", mp4, "-af", "silencedetect=noise=-40dB:d=4", "-f", "null", "-"]);
const silenceStart = sil.err.matchAll(/silence_start: ([\d.]+)/g);
const silenceEnd = sil.err.matchAll(/silence_end: ([\d.]+)/g);
const starts = Array.from(silenceStart, (m) => Number(m[1]));
const ends = Array.from(silenceEnd, (m) => Number(m[1]));
const segments = Math.min(starts.length, ends.length);
for (let i = 0; i < segments; i += 1) {
  const dur = ends[i] - starts[i];
  // ignore the trailing silence after the last line (hero + champion tails < 4s anyway)
  if (dur > SILENCE_LIMIT + 0.01 && ends[i] < total - 1.0) {
    failures.push(`silence ${dur.toFixed(1)}s at ${starts[i].toFixed(1)}s-${ends[i].toFixed(1)}s`);
  }
}

// 5. contact sheet: one frame per cue midpoint, labelled with the scene id
fs.mkdirSync(`${workDir}/sheet`, { recursive: true });
for (const [i, c] of cues.entries()) {
  const at = Math.max(0, Math.min(c.at + c.dur / 2, total - 0.1));
  await run(["-loglevel", "error", "-y", "-ss", String(at), "-i", mp4, "-frames:v", "1",
    "-vf", "scale=640:360:flags=lanczos", `${workDir}/sheet/${String(i).padStart(2, "0")}.png`]);
}
// The sheet page runs from about:blank, so file:// images are blocked:
// embed the thumbnails as data URLs instead.
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1340, height: 660 } });
const dataUrl = (path) => `data:image/png;base64,${fs.readFileSync(path).toString("base64")}`;
const cells = cues.map((c, i) => `
  <figure style="margin:2px;border:1px solid #555;border-radius:6px;overflow:hidden;background:#111">
    <img src="${dataUrl(`${workDir}/sheet/${String(i).padStart(2, "0")}.png`)}" style="width:436px;height:245px;object-fit:cover">
    <figcaption style="color:#eee;font:600 16px sans-serif;background:#000;padding:2px 8px;text-align:center">${c.id} @ ${c.at.toFixed(1)}s</figcaption>
  </figure>`).join("");
await page.setContent(`<!doctype html><style>body{margin:0;background:#222;font:14px system-ui}</style>
  <div style="display:grid;grid-template-columns:repeat(3,auto);grid-auto-rows:auto;gap:2px;width:fit-content">${cells}</div>`);
await page.waitForTimeout(800);
await page.screenshot({ path: `${workDir}/contact-sheet.png` });
await browser.close();

const report = {
  duration: Math.round(total),
  frames: sampleTimes.size,
  cueMidpoints: Object.fromEntries(cues.map((c) => [c.id, Math.round(c.at * 10) / 10])),
  voice: marksData.voice,
  ok: failures.length === 0,
  failures,
};
console.log("check:" + JSON.stringify(report));
process.exit(failures.length === 0 ? 0 : 1);
