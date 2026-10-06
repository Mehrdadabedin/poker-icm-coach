import { useRef, useState } from "react";

/** A47 video section, right under the hero: the current bundled player and
 * poster stay (a new video replaces the file later, not the markup). */
export function LandingDemo() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [showPoster, setShowPoster] = useState(true);

  const startPlayback = () => {
    const video = videoRef.current;
    if (!video) return;
    setShowPoster(false);
    const started = video.play();
    if (started && typeof started.catch === "function") {
      started.catch(() => setShowPoster(true));
    }
  };

  return (
    <section className="lp-section" id="lp-demo" aria-labelledby="lp-demo-title" data-testid="landing-demo">
      <div className="lp-inner">
        <h2 className="lp-section-title" id="lp-demo-title">See ICM BOT in action</h2>
        <span className="lp-section-rule" aria-hidden="true" />
        <div className="lp-video" data-testid="landing-video" data-video-slot="16:9">
          <video
            className="lp-video-el"
            data-testid="landing-video-player"
            controls
            preload="metadata"
            playsInline
            poster="/videos/ICMBOT_video_poster.png"
            ref={videoRef}
            onPlay={() => setShowPoster(false)}
            onPause={() => setShowPoster(true)}
            onEnded={() => setShowPoster(true)}
          >
            <source src="/videos/ICM_BOT_demo_bot_profiles_narrated.mp4" type="video/mp4" />
          </video>
          {showPoster && (
            <button
              type="button"
              className="lp-video-poster"
              data-testid="landing-video-poster"
              aria-label="Play ICM BOT demo video"
              onClick={startPlayback}
            >
              <img src="/videos/ICMBOT_video_poster.png" alt="" draggable={false} />
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
