const SPANISH_HOST = /(^|\.)icmbot\.es$/;
const LOCAL_HOST = /^(localhost|127\.0\.0\.1)$/;

/** The demo video and its poster. Only icmbot.es (and www.) shows the Spanish
 * one, whatever the page language. On localhost, ?demoVideo=es shows it too,
 * for testing; no other domain honours that. */
export function demoVideo(
  host: string = window.location.hostname,
  search: string = window.location.search,
): { src: string; poster: string } {
  const spanish = SPANISH_HOST.test(host)
    || (LOCAL_HOST.test(host) && new URLSearchParams(search).get("demoVideo") === "es");
  const suffix = spanish ? ".es" : "";
  return { src: `/videos/ICMBOT_promo${suffix}.mp4`, poster: `/videos/ICMBOT_video_poster${suffix}.png` };
}
