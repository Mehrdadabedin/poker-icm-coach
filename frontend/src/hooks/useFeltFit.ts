import { useLayoutEffect, type RefObject } from "react";

/** The smallest the felt may get: below this, names and cards are too small to read. */
export const MIN_FELT_ZOOM = 0.6;

/** How far the page reaches past the bottom of the window. */
const overflow = (): number => (document.scrollingElement?.scrollHeight ?? 0) - window.innerHeight;

/** Scales the felt to the zoom that makes the page fit, 1 when it fits as it is. */
export function fitFelt(felt: HTMLElement): number {
  felt.style.zoom = "";
  let zoom = 1;
  // zoom also moves what follows the felt, so a second or third pass settles the rounding
  for (let pass = 0; pass < 3; pass += 1) {
    const over = overflow();
    if (over <= 0) break;
    const height = felt.getBoundingClientRect().height;
    if (height <= over) break;
    zoom = Math.max(MIN_FELT_ZOOM, zoom * ((height - over) / height));
    felt.style.zoom = String(zoom);
    if (zoom === MIN_FELT_ZOOM) break;
  }
  return zoom;
}

/** On a phone held upright the seats must never sit behind the bet controls: when the
 * page would overflow (a short phone, several live seats, a flop on the board), the
 * felt shrinks just enough to fit, down to 60%, and grows back when there is room.
 * `layout` changes whenever the felt's content does (seats with cards, the board). */
export function useFeltFit(felt: RefObject<HTMLElement | null>, on: boolean, layout: string): void {
  useLayoutEffect(() => {
    const el = felt.current;
    if (!el) return undefined;
    if (!on) {
      el.style.zoom = "";
      return undefined;
    }
    const fit = () => fitFelt(el);
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [felt, on, layout]);
}
