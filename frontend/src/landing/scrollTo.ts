/**
 * A47 — smooth in-page scrolling for the landing header and hero actions.
 * The app uses HashRouter, so anchors like href="#faq" would change the
 * route; these buttons scroll with JS instead, and the sticky header offset
 * is handled by scroll-margin-top on the target sections (landing.css).
 */
export function scrollToSection(id: string): void {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}
