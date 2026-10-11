import { useEffect } from "react";

const DEMO_ID = "lm-demo";

/** Brings the demo block into view. Reduced-motion visitors jump instead of
 * gliding; jsdom has no matchMedia or scrollIntoView, so both are guarded. */
export function scrollToDemo(): void {
  const reduced = typeof window.matchMedia === "function"
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const block = document.getElementById(DEMO_ID);
  if (block && typeof block.scrollIntoView === "function") {
    block.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
  }
}

/** The demo video. It is only mounted after "Watch the demo" is clicked, so
 * the video file is not requested before that, and it never autoplays: the
 * visitor starts it with the player's own controls. */
export function MinimalDemo() {
  useEffect(() => {
    scrollToDemo();
  }, []);

  return (
    <section className="lm-demo" id={DEMO_ID} aria-label="Demo video" data-testid="minimal-demo">
      <video
        className="lm-video"
        data-testid="minimal-video"
        controls
        preload="metadata"
        playsInline
        poster="/videos/ICMBOT_video_poster.png"
      >
        <source src="/videos/ICMBOT_promo.mp4" type="video/mp4" />
      </video>
    </section>
  );
}
