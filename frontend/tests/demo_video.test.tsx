import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { I18nProvider } from "../src/i18n/I18n";
import type { Lang } from "../src/i18n/lang";
import { LandingDemo } from "../src/landing/LandingDemo";
import { MinimalDemo } from "../src/landing-minimal/MinimalDemo";

const cases: [Lang, string, string][] = [
  ["en", "/videos/ICMBOT_promo.mp4", "/videos/ICMBOT_video_poster.png"],
  ["es", "/videos/ICMBOT_promo.es.mp4", "/videos/ICMBOT_video_poster.es.png"],
];

describe("demo video by language", () => {
  it.each(cases)("landing demo in %s", (lang, src, poster) => {
    render(<I18nProvider initial={lang}><LandingDemo /></I18nProvider>);
    const player = screen.getByTestId("landing-video-player");
    expect(player).toHaveAttribute("poster", poster);
    expect(player.querySelector("source")).toHaveAttribute("src", src);
    expect(screen.getByTestId("landing-video-poster").querySelector("img")).toHaveAttribute("src", poster);
  });

  it.each(cases)("minimal demo in %s", (lang, src, poster) => {
    render(<I18nProvider initial={lang}><MinimalDemo /></I18nProvider>);
    const video = screen.getByTestId("minimal-video");
    expect(video).toHaveAttribute("poster", poster);
    expect(video.querySelector("source")).toHaveAttribute("src", src);
  });
});
