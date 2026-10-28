import { afterEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { I18nProvider } from "../src/i18n/I18n";
import { demoVideo } from "../src/landing/demoVideo";
import { MinimalDemo } from "../src/landing-minimal/MinimalDemo";

const EN = { src: "/videos/ICMBOT_promo.mp4", poster: "/videos/ICMBOT_video_poster.png" };
const ES = { src: "/videos/ICMBOT_promo.es.mp4", poster: "/videos/ICMBOT_video_poster.es.png" };

describe("demo video by domain", () => {
  it.each(["icmbot.es", "www.icmbot.es"])("%s plays the Spanish video", (host) => {
    expect(demoVideo(host, "")).toEqual(ES);
  });

  it.each(["icmbot.one", "www.icmbot.one", "poker-icm-coach.onrender.com", "noticmbot.es", "icmbot.es.evil.com"])(
    "%s keeps the English video, also with ?lang=es",
    (host) => {
      expect(demoVideo(host, "")).toEqual(EN);
      expect(demoVideo(host, "?lang=es")).toEqual(EN);
      expect(demoVideo(host, "?demoVideo=es")).toEqual(EN);
    },
  );

  it("localhost shows the Spanish video only with ?demoVideo=es", () => {
    expect(demoVideo("localhost", "")).toEqual(EN);
    expect(demoVideo("localhost", "?lang=es")).toEqual(EN);
    expect(demoVideo("localhost", "?demoVideo=es")).toEqual(ES);
  });
});

describe("the landing demo follows the domain, not the language", () => {
  afterEach(() => window.history.replaceState(null, "", "/"));

  it("Spanish page on a non-Spanish domain keeps the English video", () => {
    render(<I18nProvider initial="es"><MinimalDemo /></I18nProvider>);
    expect(screen.getByTestId("minimal-video").querySelector("source")).toHaveAttribute("src", EN.src);
  });

  it("?demoVideo=es on localhost switches the landing demo", () => {
    window.history.replaceState(null, "", "/?demoVideo=es");
    render(<I18nProvider initial="en"><MinimalDemo /></I18nProvider>);
    const player = screen.getByTestId("minimal-video");
    expect(player).toHaveAttribute("poster", ES.poster);
    expect(player.querySelector("source")).toHaveAttribute("src", ES.src);
  });
});
