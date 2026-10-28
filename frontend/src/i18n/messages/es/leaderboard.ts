/* Spanish: the leaderboard (plan 102). */
import type { leaderboard as en } from "../en/leaderboard";

export const leaderboard: Record<keyof typeof en, string> = {
  "leaderboard.title": "Clasificación",
  "leaderboard.back": "Volver a Inicio",
  "leaderboard.top": "Top 100",
  "leaderboard.week": "Esta semana",
  "leaderboard.all": "Siempre",
  "leaderboard.dates": "{from} al {to} (UTC)",
  "leaderboard.updated": "Actualizado hace {n} min",
  "leaderboard.updatedNow": "Actualizado ahora",
  "leaderboard.stats": "{wins} · {played}",
  "leaderboard.wins.one": "{n} victoria",
  "leaderboard.wins.other": "{n} victorias",
  "leaderboard.played.one": "{n} jugado",
  "leaderboard.played.other": "{n} jugados",
  "leaderboard.points.one": "{n} punto",
  "leaderboard.points.other": "{n} puntos",
  "leaderboard.you": "Tú, {name}",
  "leaderboard.noProfile": "Crea tu perfil para aparecer",
  "leaderboard.empty.week": "Aún no hay torneos terminados esta semana.",
  "leaderboard.empty.all": "Aún no hay torneos terminados.",
  "leaderboard.error": "No se pudo cargar la clasificación.",
};
