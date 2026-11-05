/* A fake speechSynthesis for jsdom, which has none (plan 112). */
export interface FakeSpeech {
  /** every utterance spoken, in order */
  spoken: { text: string; lang: string; rate: number }[];
  cancels: () => number;
  remove: () => void;
}

class FakeUtterance {
  lang = "";
  rate = 1;
  voice: unknown = null;
  constructor(public text: string) {}
}

export function installFakeSpeech(): FakeSpeech {
  const spoken: FakeSpeech["spoken"] = [];
  let cancels = 0;
  const engine = {
    speak: (u: FakeUtterance) => spoken.push({ text: u.text, lang: u.lang, rate: u.rate }),
    cancel: () => { cancels += 1; },
    getVoices: () => [{ lang: "en-US", localService: true }, { lang: "es-ES", localService: true }],
  };
  Object.defineProperty(window, "speechSynthesis", { configurable: true, value: engine });
  Object.defineProperty(globalThis, "SpeechSynthesisUtterance", { configurable: true, value: FakeUtterance });
  return {
    spoken, cancels: () => cancels,
    remove: () => {
      Reflect.deleteProperty(window, "speechSynthesis");
      Reflect.deleteProperty(globalThis, "SpeechSynthesisUtterance");
    },
  };
}
