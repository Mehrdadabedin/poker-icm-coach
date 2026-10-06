/** A47 — FAQ: exactly three questions. "Is it free?" is deliberately absent. */
const FAQ_ITEMS = [
  {
    q: "Is real money involved?",
    a: "No. ICMBOT is practice only and never touches real money.",
  },
  {
    q: "Do I need to know ICM?",
    a: "No. The coach explains each decision as you play.",
  },
  {
    q: "Does it work on my phone?",
    a: "Yes. It runs in your browser and as an Android app.",
  },
];

export function LandingFaq() {
  return (
    <section className="lp-section lp-band" id="lp-faq" aria-labelledby="lp-faq-title" data-testid="landing-faq">
      <div className="lp-inner lp-narrow">
        <h2 className="lp-section-title" id="lp-faq-title">FAQ</h2>
        <span className="lp-section-rule" aria-hidden="true" />
        <dl className="lp-faq-list">
          {FAQ_ITEMS.map((item) => (
            <div key={item.q} className="lp-faq-item">
              <dt className="lp-faq-q">{item.q}</dt>
              <dd className="lp-faq-a">{item.a}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
