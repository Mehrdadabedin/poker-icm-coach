/** A47 — THE COACH: a real table screenshot (Playwright, demo user "Hero",
 * public/images/table-coach.webp) plus the three points that sell the panel. */
const COACH_POINTS = [
  {
    title: "One clear action",
    text: "Every decision gets a single recommendation, never a wall of theory.",
  },
  {
    title: "The reason in one line",
    text: "Each call is backed by one readable line that explains the math.",
  },
  {
    title: "The tournament picture",
    text: "ICM pressure, bubble, stack band, risk premium, pot odds and SPR: the factors that matter near the money bubble.",
  },
];

export function LandingCoach() {
  return (
    <section className="lp-section lp-band" id="lp-coach" aria-labelledby="lp-coach-title" data-testid="landing-coach">
      <div className="lp-inner">
        <h2 className="lp-section-title" id="lp-coach-title">The coach</h2>
        <span className="lp-section-rule" aria-hidden="true" />
        <div className="lp-coach-layout">
          <img
            className="lp-coach-shot"
            src="/images/table-coach.webp"
            alt="Live ICMBOT table with the coach panel showing a FOLD recommendation"
            data-testid="landing-coach-shot"
          />
          <ul className="lp-coach-points">
            {COACH_POINTS.map((point) => (
              <li key={point.title} className="lp-coach-point">
                <h3 className="lp-coach-point-title">{point.title}</h3>
                <p className="lp-coach-point-text">{point.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
