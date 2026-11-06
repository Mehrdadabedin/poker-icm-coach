/* Persian reads right to left (plan 113 step 2): every stylesheet says start
 * and end, not left and right, so the page mirrors under dir="rtl". The felt,
 * its seats and the champion plaque are drawn left to right and keep physical
 * sides; a box centred with left: 50% and translateX(-50%) is the same both
 * ways and carries the marker below. */
import { readdirSync, readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";

const STYLES = resolve(__dirname, "../src/styles");
const LTR_FILES = new Set(["felt.css", "seats.css", "table-seats.css", "placement.css", "winner.css"]);
const MARKER = "/* physical: centred */";

const PHYSICAL = [
  /(?<![-\w])(left|right)\s*:/,
  /text-align\s*:\s*(left|right)\b/,
  /\b(margin|padding|border)-(left|right)\b/,
  /float\s*:\s*(left|right)\b/,
  /border-(top|bottom)-(left|right)-radius/,
];

/** The values of a shorthand, keeping calc(...) and var(...) whole. */
function values(text: string): string[] {
  const out = [""];
  let depth = 0;
  for (const ch of text.trim()) {
    depth += ch === "(" ? 1 : ch === ")" ? -1 : 0;
    if (/\s/.test(ch) && depth === 0) {
      if (out[out.length - 1]) out.push("");
    } else out[out.length - 1] += ch;
  }
  return out;
}

/** margin: 0 3px 0 0 sets one side only, so it does not mirror. */
function oneSided(line: string): boolean {
  return [...line.matchAll(/(?<![-\w])(margin|padding)\s*:\s*([^;{}]+)/g)].some((m) => {
    const v = values(m[2].replace("!important", ""));
    return v.length === 4 && v[1] !== v[3];
  });
}

function physicalLines(file: string): string[] {
  let inComment = false;
  return readFileSync(resolve(STYLES, file), "utf8").split("\n").flatMap((raw, i) => {
    let line = raw;
    if (inComment) {
      if (!line.includes("*/")) return [];
      line = line.slice(line.indexOf("*/") + 2);
      inComment = false;
    }
    line = line.replace(/\/\*.*?\*\//g, "");
    if (line.includes("/*")) {
      inComment = true;
      line = line.slice(0, line.indexOf("/*"));
    }
    if (raw.includes(MARKER)) return [];
    return PHYSICAL.some((p) => p.test(line)) || oneSided(line) ? [`${file}:${i + 1}: ${raw.trim()}`] : [];
  });
}

describe("stylesheets mirror for right-to-left languages", () => {
  it("say start and end, not left and right, outside the left-to-right files", () => {
    const files = readdirSync(STYLES).filter((f) => f.endsWith(".css") && !LTR_FILES.has(f));
    expect(files.length).toBeGreaterThan(40);
    expect(files.flatMap(physicalLines)).toEqual([]);
  });

  it("finds a physical side when one comes back", () => {
    expect(PHYSICAL.some((p) => p.test(".x { margin-left: 8px; }"))).toBe(true);
    expect(PHYSICAL.some((p) => p.test(".x { inset-inline-start: 0; text-align: start; }"))).toBe(false);
    expect(oneSided(".x { margin: 0 3px 0 0; }")).toBe(true);
    expect(oneSided(".x { padding: 0 calc(3 * var(--k)) 0 calc(3 * var(--k)); }")).toBe(false);
  });
});
