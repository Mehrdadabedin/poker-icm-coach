/* Fonts for Persian and Simplified Chinese (plan 113 step 3): Vazirmatn for
 * Arabic script only, the Chinese system fonts after the page's own, and no
 * letter-spacing in either. A new font-family in styles/ needs its Persian
 * and Chinese twin in scripts.css, or Persian falls back to whatever the
 * phone has. */
import { readdirSync, readFileSync, statSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";

const STYLES = resolve(__dirname, "../src/styles");
const FONTS = resolve(__dirname, "../public/fonts");
const scripts = readFileSync(resolve(STYLES, "scripts.css"), "utf8");
// an "i" in a circle, never Persian or Chinese
const LATIN_ONLY = new Set([".tbl-chip-i"]);

/** Every selector in styles/ that names its own fonts. */
function fontSelectors(): string[] {
  return readdirSync(STYLES).filter((f) => f.endsWith(".css") && f !== "scripts.css").flatMap((file) => {
    const css = readFileSync(resolve(STYLES, file), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    return [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
      .filter(([, , body]) => /font-family\s*:\s*(?!\s|inherit|var\()/.test(body))
      .flatMap(([, selector]) => selector.split(",").map((s) => s.trim()));
  });
}

/** The selectors of the rules in scripts.css for one language. */
const coveredFor = (lang: "fa" | "zh") => [...scripts.matchAll(new RegExp(`html:lang\\(${lang}\\)\\s*([^{]+)\\{[^}]*font-family`, "g"))]
  .flatMap(([, selector]) => selector.replace(/^:is\(|\)\s*$/g, "").split(",").map((s) => s.trim()));

describe("fonts for Persian and Chinese", () => {
  it("gives every font-family in styles/ a Persian and a Chinese twin", () => {
    const own = fontSelectors().filter((s) => !LATIN_ONLY.has(s));
    expect(own.length).toBeGreaterThanOrEqual(9);
    for (const lang of ["fa", "zh"] as const) {
      expect(own.filter((s) => !coveredFor(lang).includes(s)), lang).toEqual([]);
    }
    // the landing page names its fonts in two variables
    expect(scripts).toMatch(/html:lang\(fa\) \.lm-page \{\s*--lm-head: "Vazirmatn"[^}]*--lm-body: "Vazirmatn"/);
    expect(scripts).toMatch(/html:lang\(zh\) \.lm-page \{\s*--lm-head: "Archivo", "PingFang SC"[^}]*--lm-body: "Instrument Sans", "PingFang SC"/);
  });

  it("loads Vazirmatn only for Arabic script, regular and bold, from small files with their licence", () => {
    const faces = [...scripts.matchAll(/@font-face \{([^}]*)\}/g)].map(([, body]) => body);
    expect(faces).toHaveLength(2);
    for (const face of faces) {
      expect(face).toContain('font-family: "Vazirmatn"');
      expect(face).toMatch(/unicode-range: U\+0600-06FF/);
      expect(face).toContain("font-display: swap");
      const file = /url\("\/fonts\/([^"]+)"\)/.exec(face)?.[1] ?? "";
      expect(statSync(resolve(FONTS, file)).size, file).toBeLessThan(60_000);
    }
    expect(faces.map((f) => /font-weight: (\d+)/.exec(f)?.[1])).toEqual(["400", "700"]);
    expect(readFileSync(resolve(FONTS, "Vazirmatn-OFL.txt"), "utf8")).toContain("SIL Open Font License, Version 1.1");
  });

  it("drops letter-spacing in both and keeps Chinese punctuation off the start of a line", () => {
    expect(scripts).toContain("html:is(:lang(fa), :lang(zh)) * { letter-spacing: 0 !important; }");
    expect(scripts).toMatch(/html:lang\(zh\) body \{[^}]*line-break: strict;/);
  });

  it("is loaded after every other sheet, so its rules win", () => {
    const main = readFileSync(resolve(__dirname, "../src/main.tsx"), "utf8");
    const sheets = [...main.matchAll(/import "\.\/styles\/([^"]+)";/g)].map(([, f]) => f);
    expect(sheets[sheets.length - 1]).toBe("scripts.css");
  });
});
