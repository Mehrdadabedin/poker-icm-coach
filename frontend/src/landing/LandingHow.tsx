/** A47 — HOW IT WORKS: three steps from sign-up to graded decisions. */
const STEPS = [
  { n: "1", title: "Sign up", text: "Create an account in seconds (or continue with Google)." },
  { n: "2", title: "Choose your opponents", text: "Pick the bot lineup you want to face." },
  { n: "3", title: "Play and get graded", text: "Every decision is graded PREFERRED, ACCEPTABLE or SUBOPTIMAL." },
];

export function LandingHow() {
  return (
    <section className="lp-section lp-band-soft" id="lp-how" aria-labelledby="lp-how-title" data-testid="landing-how">
      <div className="lp-inner">
        <h2 className="lp-section-title" id="lp-how-title">How it works</h2>
        <span className="lp-section-rule" aria-hidden="true" />
        <ol className="lp-how-steps">
          {STEPS.map((step) => (
            <li key={step.n} className="lp-how-step">
              <span className="lp-how-num" aria-hidden="true">{step.n}</span>
              <h3 className="lp-how-title">{step.title}</h3>
              <p className="lp-how-text">{step.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
