import { Fragment, useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { useT } from "../i18n/I18n";
import { en } from "../i18n/messages/en";
import { ROW_TERM, TOKEN_PATTERN, defKey, exKey, nameKey, termById, termHref, tokenTerm } from "../glossary/terms";

const GAP = 6;
const EDGE = 8;

interface Place { left: number; width: number; top?: number; bottom?: number }

/** Below the term, or above it when the term sits low on the screen, and
 * never past the screen's edges: a phone held upright is 360 px wide. */
function placeFor(el: HTMLElement): Place {
  const r = el.getBoundingClientRect();
  const width = Math.min(300, window.innerWidth - 2 * EDGE);
  const left = Math.max(EDGE, Math.min(r.left, window.innerWidth - width - EDGE));
  return r.bottom > window.innerHeight * 0.6
    ? { left, width, bottom: window.innerHeight - r.top + GAP }
    : { left, width, top: r.bottom + GAP };
}

/** A term the player can tap (plan 097): a short definition opens beside it,
 * with a link to the glossary entry. A tap, not a hover, so it works on a
 * phone, and the table stays open underneath. Unknown ids render as text. */
export function GlossaryTerm({ id, children }: { id: string; children: ReactNode }) {
  const t = useT();
  const popId = useId();
  const button = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLSpanElement>(null);
  const [place, setPlace] = useState<Place | null>(null);
  const close = useCallback(() => setPlace(null), []);

  useEffect(() => {
    if (!place) return undefined;
    const outside = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!button.current?.contains(target) && !pop.current?.contains(target)) close();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [place, close]);

  if (!termById.has(id)) return <>{children}</>;
  const toggle = () => setPlace((open) => (open || !button.current ? null : placeFor(button.current)));
  const example = exKey(id) in en ? t(exKey(id)) : null;
  return (
    <>
      <button ref={button} type="button" className="gl-term" aria-haspopup="dialog" aria-expanded={!!place}
        aria-controls={place ? popId : undefined} data-testid={`gl-term-${id}`} onClick={toggle}>
        {children}
      </button>
      {place && createPortal(
        <span ref={pop} id={popId} role="dialog" aria-label={t(nameKey(id))} className="gl-pop"
          style={place} data-testid="gl-pop">
          <b className="gl-pop-name">{termById.get(id)?.abbr ? `${termById.get(id)?.abbr} · ` : ""}{t(nameKey(id))}</b>
          <span className="gl-pop-def">{t(defKey(id))}</span>
          {example && <span className="gl-pop-ex">{example}</span>}
          <span className="gl-pop-actions">
            <Link to={termHref(id)} onClick={close} data-testid="gl-pop-open">{t("glossary.open")}</Link>
            <button type="button" onClick={close}>{t("glossary.close")}</button>
          </span>
        </span>,
        document.body,
      )}
    </>
  );
}

/** Text with every glossary abbreviation in it (CO, BB, ICM, SPR...) made tappable. */
export function LinkedText({ text }: { text: string }) {
  if (!text) return null; // a coach without a reason (older snapshots) shows none, as before
  const parts = text.split(TOKEN_PATTERN);
  if (parts.length === 1) return <>{text}</>;
  return (
    <>
      {parts.map((part, i) => {
        const id = i % 2 === 1 ? tokenTerm(part) : undefined;
        return <Fragment key={i}>{id ? <GlossaryTerm id={id}>{part}</GlossaryTerm> : part}</Fragment>;
      })}
    </>
  );
}

/** A coach factor row's label, tappable when the glossary explains it. */
export function RowLabel({ code, label }: { code: string; label: string }) {
  const id = ROW_TERM[code];
  return id ? <GlossaryTerm id={id}>{label}</GlossaryTerm> : <>{label}</>;
}
