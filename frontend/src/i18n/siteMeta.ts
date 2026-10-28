/* The page head each site serves before any JavaScript runs (plan 093).
 * Link-preview crawlers (WhatsApp, Facebook, X) read only this HTML, so the
 * runtime language switch in lang.ts cannot reach them. Render serves a static
 * site by path only, never by host, so icmbot.es is a second static site built
 * with VITE_SITE_LANG=es. index.html holds the English head; siteHtml rewrites
 * it for the other site. */
import type { Lang } from "./lang";

export interface SiteMeta {
  origin: string;
  title: string;
  description: string;
  ogTitle: string;
  ogDescription: string;
  twitterDescription: string;
  imageAlt: string;
  locale: string;
  image: string;
}

export const SITE_META: Record<Lang, SiteMeta> = {
  en: {
    origin: "https://icmbot.one",
    title: "ICMBOT",
    description:
      "ICMBOT is a tournament poker trainer. Play 9-handed tournaments against 8 bots and get the ICM coach's call before every decision. Practice only, no real money.",
    ogTitle: "ICMBOT — Tournament Poker Trainer",
    ogDescription:
      "Play 9-handed tournaments against 8 bots. Before every decision, the ICM coach tells you what to do and why. Practice only, no real money.",
    twitterDescription: "Play 9-handed tournaments against 8 bots. Before every decision, the ICM coach tells you what to do and why.",
    imageAlt: "ICMBOT on a phone: the ICM coach says RAISE and why, above a table with 9 players and the action buttons, beside the text Tournament poker practice with an ICM coach",
    locale: "en_US",
    image: "/images/og-app-1200x630.jpg",
  },
  es: {
    origin: "https://icmbot.es",
    title: "ICMBOT",
    description:
      "ICMBOT es un entrenador de póker de torneos. Juega torneos de 9 jugadores contra 8 bots y recibe la jugada del coach ICM antes de cada decisión. Solo práctica, sin dinero real.",
    ogTitle: "ICMBOT · Entrenador de póker de torneos",
    ogDescription:
      "Juega torneos de 9 jugadores contra 8 bots. Antes de cada decisión, el coach ICM te dice qué hacer y por qué. Solo práctica, sin dinero real.",
    twitterDescription: "Juega torneos de 9 jugadores contra 8 bots. Antes de cada decisión, el coach ICM te dice qué hacer y por qué.",
    imageAlt: "ICMBOT en un móvil: el coach ICM dice SUBIR y por qué, sobre una mesa con 9 jugadores y los botones de acción, junto al texto Práctica de póker de torneos con un coach ICM",
    locale: "es_ES",
    image: "/images/og-app-1200x630-es.jpg",
  },
};

const escapeAttr = (s: string): string => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

// Each pattern must match index.html exactly once; siteHtml throws otherwise,
// so an edited index.html fails the build instead of shipping an English head.
const META_TAG = (attr: "name" | "property", key: string): RegExp =>
  new RegExp(`(<meta\\s+${attr}="${key}"\\s+content=")[^"]*(")`, "g");

function replaceOnce(html: string, pattern: RegExp, value: string): string {
  const hits = html.match(pattern)?.length ?? 0;
  if (hits !== 1) throw new Error(`siteHtml: ${pattern} matched ${hits} times in index.html, expected 1`);
  return html.replace(pattern, (_all, ...groups: string[]) => `${groups[0]}${value}${groups[1]}`);
}

/** index.html with the head of the site that speaks `lang`. The hreflang links
 * stay the same on both sites, so each names the other. */
export function siteHtml(html: string, lang: Lang): string {
  const m = SITE_META[lang];
  const image = `${m.origin}${m.image}`;
  const swaps: [RegExp, string][] = [
    [/(<html\s+lang=")[^"]*(")/g, lang],
    [/(<title>)[^<]*(<\/title>)/g, m.title],
    [/(<link\s+rel="canonical"\s+href=")[^"]*(")/g, `${m.origin}/`],
    [META_TAG("name", "description"), m.description],
    [META_TAG("property", "og:url"), `${m.origin}/`],
    [META_TAG("property", "og:title"), m.ogTitle],
    [META_TAG("property", "og:description"), m.ogDescription],
    [META_TAG("property", "og:image"), image],
    [META_TAG("property", "og:image:alt"), m.imageAlt],
    [META_TAG("property", "og:locale"), m.locale],
    [META_TAG("name", "twitter:title"), m.ogTitle],
    [META_TAG("name", "twitter:description"), m.twitterDescription],
    [META_TAG("name", "twitter:image"), image],
    [META_TAG("name", "twitter:image:alt"), m.imageAlt],
  ];
  return swaps.reduce((out, [pattern, value]) => replaceOnce(out, pattern, escapeAttr(value)), html);
}
