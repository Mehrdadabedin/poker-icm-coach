import { useRef, useState } from "react";
import { useI18n } from "../i18n/I18n";
import { demoVideo } from "./demoVideo";

/** A47 video section, right under the hero: the current bundled player and
 * poster stay (a new video replaces the file later, not the markup). */
export function LandingDemo() {
  const { src, poster } = demoVideo(useI18n().lang);
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
            poster={poster}
            ref={videoRef}
            onPlay={() => setShowPoster(false)}
            onPause={() => setShowPoster(true)}
            onEnded={() => setShowPoster(true)}
          >
            <source key={src} src={src} type="video/mp4" />
          </video>
          {showPoster && (
            <button
              type="button"
              className="lp-video-poster"
              data-testid="landing-video-poster"
              aria-label="Play ICM BOT demo video"
              onClick={startPlayback}
            >
              <img src={poster} alt="" draggable={false} />
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
