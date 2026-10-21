/* Spanish: the one-time photo prompt on the bot lineup page (plan 094). */
import type { portraitPrompt as en } from "../en/portraitPrompt";

export const portraitPrompt: Record<keyof typeof en, string> = {
  "portraitPrompt.none.title": "Añade tu foto",
  "portraitPrompt.none.text": "Tu asiento aún no tiene foto. Añade una para que la mesa te muestre como a Emma y a los demás bots. Un administrador la revisa primero; mientras tanto puedes seguir jugando.",
  "portraitPrompt.pending.title": "Tu foto está pendiente de revisión",
  "portraitPrompt.pending.text": "Juegas con tu inicial hasta que un administrador la apruebe.",
  "portraitPrompt.rejected.title": "Tu foto no fue aprobada",
  "portraitPrompt.rejected.text": "Elige otra. Mientras tanto juegas con tu inicial.",
  "portraitPrompt.add": "Añadir foto",
  "portraitPrompt.later": "Ahora no",
  "portraitPrompt.choose": "Elegir otra",
  "portraitPrompt.ok": "Entendido",
};
