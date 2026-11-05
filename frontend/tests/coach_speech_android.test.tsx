/* The coach's voice in the Android app (plan 112 PR 2). Its web view has no speechSynthesis, so
 * the app speaks with the native TextToSpeech plugin. The app loads the live site, so an app built
 * before the plugin runs this code too and must show no chip. */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { Capacitor } from "@capacitor/core";
import { APP_USER_AGENT } from "../src/services/platform";
import { type FakeSpeech, installFakeSpeech } from "./speech_fake";
import { view } from "./strip_helpers";

vi.mock("../src/services/plan", () => ({
  usePlan: () => ({ pro: true, admin: false, known: true, loading: false }),
  useIsFree: () => false,
}));
const tts = vi.hoisted(() => ({ speak: vi.fn(async () => undefined), stop: vi.fn(async () => undefined) }));
vi.mock("@capacitor-community/text-to-speech", () => ({
  TextToSpeech: tts, QueueStrategy: { Flush: 0, Add: 1 },
}));

const KEY = "icmbot.coachVoice";
const realAgent = navigator.userAgent;
let speech: FakeSpeech;
let pluginInApp = true;
const chip = () => screen.queryByRole("button", { name: /Coach voice|Voz del coach/ });
const said = () => tts.speak.mock.calls.map((call) => (call as unknown as [object])[0]);

/** the plugin is loaded with import(), and speak() and stop() run when it resolves */
async function settled(): Promise<void> {
  await vi.dynamicImportSettled();
  await new Promise((resolve) => setTimeout(resolve, 0));
}

function inApp(): void {
  vi.spyOn(navigator, "userAgent", "get").mockReturnValue(`${realAgent} ${APP_USER_AGENT}`);
}

beforeEach(() => {
  localStorage.clear();
  tts.speak.mockClear();
  tts.stop.mockClear();
  pluginInApp = true;
  vi.spyOn(Capacitor, "isPluginAvailable").mockImplementation((name) => name === "TextToSpeech" && pluginInApp);
  // a later web view may get speechSynthesis; the app must still use the plugin
  speech = installFakeSpeech();
});
afterEach(() => {
  speech.remove();
  vi.restoreAllMocks();
});

describe("in the app with the plugin", () => {
  beforeEach(inApp);

  it("speaks with the plugin, not speechSynthesis", async () => {
    view({ waitingForHero: false });
    fireEvent.click(chip() as HTMLElement);
    await settled();
    expect(said()).toEqual([{ text: "Coach voice on.", lang: "en-US", rate: 1.05, queueStrategy: 0 }]);
    expect(speech.spoken).toEqual([]);
  });

  it("queues the advice after 'Coach voice on.' in Spanish", async () => {
    view({}, {}, "es");
    fireEvent.click(chip() as HTMLElement);
    await settled();
    expect(said()).toHaveLength(2);
    expect(said()[0]).toMatchObject({ text: "Voz del coach activada.", lang: "es-ES", queueStrategy: 0 });
    expect(said()[1]).toMatchObject({ lang: "es-ES", queueStrategy: 1 });
  });

  it("stops the plugin when the hero acts", async () => {
    localStorage.setItem(KEY, "1");
    const { container } = view({ toCall: 300, legalActions: [{ kind: "fold" }, { kind: "call" }] });
    await settled();
    expect(said()).toHaveLength(1);
    fireEvent.click(container.querySelector(".btn-call") as HTMLElement);
    await settled();
    expect(tts.stop).toHaveBeenCalled();
    expect(speech.cancels()).toBe(0);
  });

  it("stops the plugin when the app goes to the background", async () => {
    localStorage.setItem(KEY, "1");
    view();
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
    document.dispatchEvent(new Event("visibilitychange"));
    Reflect.deleteProperty(document, "visibilityState");
    await settled();
    expect(tts.stop).toHaveBeenCalled();
  });

  it("skips Safari's empty unlock sentence", async () => {
    localStorage.setItem(KEY, "1");
    view({ waitingForHero: false });
    fireEvent.pointerDown(document.body);
    fireEvent.click(chip() as HTMLElement);
    await settled();
    expect(tts.stop).toHaveBeenCalled();
    expect(said()).toEqual([]);
  });
});

describe("an app built before the plugin", () => {
  beforeEach(() => {
    inApp();
    pluginInApp = false;
  });

  it("shows no chip and says nothing, even with the voice saved on", async () => {
    localStorage.setItem(KEY, "1");
    view();
    expect(chip()).toBeNull();
    await settled();
    expect(said()).toEqual([]);
    expect(speech.spoken).toEqual([]);
  });
});

describe("a browser", () => {
  it("keeps speechSynthesis and never loads the plugin", async () => {
    view({ waitingForHero: false });
    fireEvent.click(chip() as HTMLElement);
    expect(speech.spoken.map((s) => s.text)).toEqual(["Coach voice on."]);
    await settled();
    expect(said()).toEqual([]);
    expect(Capacitor.isPluginAvailable).not.toHaveBeenCalled();
  });
});
