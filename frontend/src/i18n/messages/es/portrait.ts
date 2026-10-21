/* Spanish: the player's portrait page and its home menu card (plan 094). */
import type { portrait as en } from "../en/portrait";

export const portrait: Record<keyof typeof en, string> = {
  "portrait.title": "Tu retrato",
  "portrait.status.none": "SIN FOTO",
  "portrait.status.pending": "PENDIENTE DE REVISIÓN",
  "portrait.status.approved": "APROBADA",
  "portrait.status.rejected": "NO APROBADA",
  "portrait.hint.none": "Añade una foto tuya. No se muestra hasta que un administrador la aprueba.",
  "portrait.hint.pending": "Un administrador revisa tu foto antes de mostrarla en tu asiento de la mesa.",
  "portrait.hint.approved": "Tu foto se muestra en tu asiento de la mesa.",
  "portrait.hint.rejected": "Un administrador no aprobó esta foto. Elige otra.",
  "portrait.choose": "Elegir una foto",
  "portrait.change": "Elegir otra foto",
  "portrait.remove": "Quitar la foto",
  "portrait.uploading": "Subiendo…",
  "portrait.note": "JPG, PNG o WebP. La foto se reduce antes de subirla.",
  "portrait.error": "No se pudo usar ese archivo. Elige una foto JPG, PNG o WebP.",
  "portrait.alt": "Tu foto",
  "home.portrait.title": "Tu retrato",
  "home.portrait.text": "Tu foto en tu asiento de la mesa",
};
