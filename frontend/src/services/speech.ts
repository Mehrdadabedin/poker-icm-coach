/* Speaking text aloud with the device's voice (plan 112). The browser engine
 * only; the Android web view has none, so the app gets its own engine in PR 2. */

const RATE = 1.05;

export const speechAvailable = (): boolean =>
  typeof window !== "undefined" && "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined";

const tag = (voice: SpeechSynthesisVoice): string => voice.lang.replace("_", "-").toLowerCase();

/** A local voice for the language when the device has one, else the engine's default. Chrome
 * fills the list late (voiceschanged), so it is read when something is spoken, not at load. */
function voiceFor(locale: string): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  return voices.find((v) => v.localService && tag(v) === locale.toLowerCase())
    ?? voices.find((v) => v.localService && tag(v).startsWith(locale.slice(0, 2).toLowerCase()));
}

/** Says `text`. It cuts off what is still being said, unless `queue` asks to wait for it. */
export function speak(text: string, locale: string, queue = false): void {
  if (!speechAvailable()) return;
  if (!queue) window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = locale;
  utterance.rate = RATE;
  const voice = voiceFor(locale);
  if (voice) utterance.voice = voice;
  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking(): void {
  if (speechAvailable()) window.speechSynthesis.cancel();
}
