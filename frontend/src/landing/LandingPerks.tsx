/** A47 — WHAT YOU GET: the nine feature cards. */
const PERKS = [
  { title: "Exact ICM", text: "Independent Chip Model equity for up to 9 players." },
  { title: "Test mode", text: "Practice spots and get graded, decision by decision." },
  { title: "Hand review", text: "Replay every hand and see where you gained or leaked." },
  { title: "Leak finder", text: "Spot the decisions that quietly gave chips away." },
  { title: "Push/fold and ranges", text: "Preflop push/fold calls and the full range matrix." },
  { title: "Real tournament structure", text: "Blinds, levels, antes, bubble structure, payouts." },
  { title: "Works with AI agents (WebMCP)", text: "Watch, train and ask via the page's WebMCP tools." },
  { title: "Phone and Android app", text: "Runs in the browser and as an Android app." },
  { title: "Eight opponent seats", text: "Eight AI opponents with distinct playing styles." },
];

export function LandingPerks() {
  return (
    <section className="lp-section lp-band-soft" id="lp-perks" aria-labelledby="lp-perks-title" data-testid="landing-perks">
      <div className="lp-inner">
        <h2 className="lp-section-title" id="lp-perks-title">What you get</h2>
        <span className="lp-section-rule" aria-hidden="true" />
        <ul className="lp-perks">
          {PERKS.map((perk) => (
            <li key={perk.title} className="lp-perk">
              <h3 className="lp-perk-title">{perk.title}</h3>
              <p className="lp-perk-text">{perk.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
