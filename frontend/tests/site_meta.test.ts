import { readFileSync } from "fs";
import { resolve } from "path";
import { SITE_META, siteHtml } from "../src/i18n/siteMeta";

const INDEX = readFileSync(resolve(__dirname, "../index.html"), "utf8");

const head = (html: string) => new DOMParser().parseFromString(html, "text/html");
const meta = (doc: Document, key: string) =>
  doc.querySelector(`meta[property="${key}"], meta[name="${key}"]`)?.getAttribute("content");

describe("site head (plan 093)", () => {
  it("index.html already is the icmbot.one head, so the English build needs no rewrite", () => {
    expect(siteHtml(INDEX, "en")).toBe(INDEX);
  });

  it("the icmbot.es build previews in Spanish and points at icmbot.es", () => {
    const doc = head(siteHtml(INDEX, "es"));
    const es = SITE_META.es;
    expect(doc.documentElement.lang).toBe("es");
    expect(meta(doc, "description")).toBe(es.description);
    expect(meta(doc, "og:url")).toBe("https://icmbot.es/");
    expect(meta(doc, "og:title")).toBe(es.ogTitle);
    expect(meta(doc, "og:description")).toBe(es.ogDescription);
    expect(meta(doc, "og:image")).toBe("https://icmbot.es/images/og-1200x630-v2.jpg");
    expect(meta(doc, "og:image:alt")).toBe(es.imageAlt);
    expect(meta(doc, "og:locale")).toBe("es_ES");
    expect(meta(doc, "twitter:title")).toBe(es.ogTitle);
    expect(meta(doc, "twitter:description")).toBe(es.twitterDescription);
    expect(meta(doc, "twitter:image")).toBe("https://icmbot.es/images/og-1200x630-v2.jpg");
    expect(meta(doc, "twitter:image:alt")).toBe(es.imageAlt);
    expect(doc.querySelector('link[rel="canonical"]')?.getAttribute("href")).toBe("https://icmbot.es/");
  });

  it("leaves no English text and names icmbot.one only in the hreflang links", () => {
    const html = siteHtml(INDEX, "es");
    for (const text of Object.values(SITE_META.en).filter((t) => t !== "ICMBOT" && t !== SITE_META.en.origin)) {
      expect(html).not.toContain(text);
    }
    const doc = head(html);
    const one = [...doc.querySelectorAll("[href*='icmbot.one'], [content*='icmbot.one']")];
    expect(one.map((el) => el.getAttribute("hreflang"))).toEqual(["en", "x-default"]);
  });

  it("both sites carry the same hreflang links, each naming the other", () => {
    const links = (html: string) =>
      [...head(html).querySelectorAll('link[rel="alternate"]')].map((l) => `${l.getAttribute("hreflang")} ${l.getAttribute("href")}`);
    const expected = ["en https://icmbot.one/", "es https://icmbot.es/", "x-default https://icmbot.one/"];
    expect(links(INDEX)).toEqual(expected);
    expect(links(siteHtml(INDEX, "es"))).toEqual(expected);
  });

  it("fails the build when index.html no longer has a tag it must rewrite", () => {
    const edited = INDEX.replace(/<meta\s+property="og:url"[^>]*>/, "");
    expect(() => siteHtml(edited, "es")).toThrow(/og:url.*matched 0 times/);
  });
});
