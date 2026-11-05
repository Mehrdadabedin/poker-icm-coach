/* Spanish: what the coach says aloud and its speaker chip (plan 112). */
import type { speak as en } from "../en/speak";

export const speak: Record<keyof typeof en, string> = {
  "speak.chip": "Voz del coach",
  "speak.titleOn": "Voz del coach: activada",
  "speak.titleOff": "Voz del coach: desactivada",
  "speak.on": "Voz del coach activada.",
  "speak.fold": "No ir.",
  "speak.check": "Pasar.",
  "speak.call": "Igualar {amount}.",
  "speak.callPlain": "Igualar.",
  "speak.bet": "Apostar.",
  "speak.raise": "Subir.",
  "speak.threeBet": "Resubir.",
  "speak.fourBet": "Resubir.",
  "speak.allIn": "All-in.",
};
