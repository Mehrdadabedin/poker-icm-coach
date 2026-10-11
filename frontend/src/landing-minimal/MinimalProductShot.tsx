/** The real product as the hero picture: a live table with the ICM coach
 * panel, inside a plain browser frame so the page reads as study software,
 * not as a poker room. */
export function MinimalProductShot() {
  return (
    <figure className="lm-shot" data-testid="minimal-product">
      <div className="lm-shot-bar" aria-hidden="true">
        <span className="lm-shot-dot" />
        <span className="lm-shot-dot" />
        <span className="lm-shot-dot" />
        <span className="lm-shot-url">icmbot.one</span>
      </div>
      <img
        className="lm-shot-img"
        src="/images/product-table.webp"
        alt="The ICMBOT table: the ICM coach recommends a raise with K8s from the cutoff and explains why"
        width={1680}
        height={805}
        data-testid="minimal-hero-visual"
      />
    </figure>
  );
}
