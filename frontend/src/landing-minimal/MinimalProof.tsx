/** Product proof: one real card from My Mistakes, as a player sees it after a
 * session. It says in one glance what the coach does, so the page needs no
 * paragraphs of feature text. */
export function MinimalProof() {
  return (
    <section className="lm-proof" aria-labelledby="lm-proof-title" data-testid="minimal-proof">
      <h2 className="lm-proof-title" id="lm-proof-title">See exactly where you went wrong.</h2>
      <article className="lm-proof-card" aria-label="Example mistake from My Mistakes">
        <p className="lm-proof-meta">Hand #22 · MP · Preflop · ICM low</p>
        <p className="lm-proof-cards">
          <span className="lm-proof-face lm-proof-red">5{"♦"}</span>
          <span className="lm-proof-face">4{"♠"}</span>
          <span className="lm-proof-spot">19.9 BB · 100 to call</span>
        </p>
        <p className="lm-proof-line">
          You: <b className="lm-proof-you">CALL</b>
          <span aria-hidden="true">{" → "}</span>
          Coach: <b className="lm-proof-coach">FOLD</b>
        </p>
        <p className="lm-proof-why">54o is not in the MP open range.</p>
      </article>
      <p className="lm-proof-caption">From My Mistakes, after a practice session.</p>
    </section>
  );
}
