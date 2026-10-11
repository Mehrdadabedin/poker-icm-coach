import { Link } from "react-router-dom";

/** The same single action again, for visitors who read to the end. */
export function MinimalClosing() {
  return (
    <section className="lm-closing" aria-labelledby="lm-closing-title" data-testid="minimal-closing">
      <h2 className="lm-closing-title" id="lm-closing-title">Your next tournament starts here.</h2>
      <Link className="lm-btn lm-btn-primary" to="/login" data-testid="minimal-closing-start">
        Start training free
      </Link>
    </section>
  );
}
