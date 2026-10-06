import { BOT_PROFILES } from "../models/botProfiles";

/** A47 — YOUR OPPONENTS: the four bot profiles, portrait, style and
 * description, straight from models/botProfiles.ts. WebP copies of the
 * portraits keep the landing bundle small (the PNGs stay for table seats). */
export function LandingOpponents() {
  return (
    <section className="lp-section lp-band" id="lp-opponents" aria-labelledby="lp-opponents-title" data-testid="landing-opponents">
      <div className="lp-inner">
        <h2 className="lp-section-title" id="lp-opponents-title">Your opponents</h2>
        <span className="lp-section-rule" aria-hidden="true" />
        <ul className="lp-opponents">
          {BOT_PROFILES.map((profile) => (
            <li key={profile.id} className="lp-opponent">
              <img
                className="lp-opponent-portrait"
                src={`/images/bot-profiles/${profile.id}.webp`}
                alt={`${profile.name} portrait`}
              />
              <div className="lp-opponent-body">
                <h3 className="lp-opponent-name">{profile.name}</h3>
                <p className="lp-opponent-style">{profile.style}</p>
                <p className="lp-opponent-text">{profile.description}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
