import type { Lang } from "../i18n/lang";

/** The demo video and its poster: Spanish has its own, everyone else the English ones. */
export function demoVideo(lang: Lang): { src: string; poster: string } {
  const suffix = lang === "es" ? ".es" : "";
  return { src: `/videos/ICMBOT_promo${suffix}.mp4`, poster: `/videos/ICMBOT_video_poster${suffix}.png` };
}
