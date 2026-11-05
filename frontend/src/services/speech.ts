/* Speaking text aloud with the device's voice (plan 112). Browsers use speechSynthesis. The
 * Android app's web view has none, so the app speaks with a native plugin (PR 2). */
import { Capacitor } from "@capacitor/core";
import { inAndroidApp } from "./platform";

const RATE = 1.05;

/** The app loads the live site, so an app built before the plugin runs this code too. It has
 * no native TextToSpeech, and then there is no voice and no chip. */
const nativeSpeech = (): boolean => Capacitor.isPluginAvailable("TextToSpeech");

const webSpeech = (): boolean =>
  typeof window !== "undefined" && "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined";

export const speechAvailable = (): boolean => (inAndroidApp() ? nativeSpeech() : webSpeech());

// One promise for every call, so a stop() asked for after a speak() also runs after it
let loading: Promise<typeof import("@capacitor-community/text-to-speech")> | undefined;
const plugin = () => (loading ??= import("@capacitor-community/text-to-speech"));

const tag = (voice: SpeechSynthesisVoice): string => voice.lang.replace("_", "-").toLowerCase();

/** A local voice for the language when the device has one, else the engine's default. Chrome
 * fills the list late (voiceschanged), so it is read when something is spoken, not at load. */
function voiceFor(locale: string): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  return voices.find((v) => v.localService && tag(v) === locale.toLowerCase())
    ?? voices.find((v) => v.localService && tag(v).startsWith(locale.slice(0, 2).toLowerCase()));
}

function speakNative(text: string, locale: string, queue: boolean): void {
  // the empty sentence is iOS Safari's unlock tap; Android speaks without one
  if (!text) return;
  // speak() rejects when stop() or the next sentence cuts it off
  void plugin()
    .then(({ TextToSpeech, QueueStrategy }) => TextToSpeech.speak({
      text, lang: locale, rate: RATE, queueStrategy: queue ? QueueStrategy.Add : QueueStrategy.Flush,
    }))
    .catch(() => undefined);
}

/** Says `text`. It cuts off what is still being said, unless `queue` asks to wait for it. */
export function speak(text: string, locale: string, queue = false): void {
  if (!speechAvailable()) return;
  if (inAndroidApp()) return speakNative(text, locale, queue);
  if (!queue) window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = locale;
  utterance.rate = RATE;
  const voice = voiceFor(locale);
  if (voice) utterance.voice = voice;
  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking(): void {
  if (!speechAvailable()) return;
  if (inAndroidApp()) void plugin().then(({ TextToSpeech }) => TextToSpeech.stop()).catch(() => undefined);
  else window.speechSynthesis.cancel();
}
