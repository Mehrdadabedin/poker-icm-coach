/** A26 — BOT profiles: four predefined human-style playing personalities.
 *
 * The profile selected on the BOT PROFILES screen is stored in localStorage
 * (the same client-side mechanism the app already uses for the auth token) and
 * passed to POST /api/tournament at table creation. Each profile maps to an
 * existing backend personality archetype (`backend`), so the bots' actual
 * decision behaviour comes from the existing AI personality engine.
 */

export interface BotAvatar {
  /** Two-letter initials shown inside the avatar circle. */
  initials: string;
  /** Distinct background colour per profile (kept small and generic). */
  color: string;
}

export interface BotProfile {
  id: string;
  name: string;
  style: string;
  description: string;
  avatar: BotAvatar;
  /** Backend personality archetype name (see backend/app/ai/personalities.py). */
  backend: string;
}

export const BOT_PROFILES: BotProfile[] = [
  {
    id: "alex",
    name: "Alex",
    style: "Tight-Aggressive",
    description: "Plays few hands but bets and raises them hard. A sharp, pressure-applying opponent.",
    avatar: { initials: "AX", color: "#2e7d32" },
    backend: "tag",
  },
  {
    id: "sarah",
    name: "Sarah",
    style: "Loose-Aggressive",
    description: "Involves herself in many pots and keeps the pressure on with frequent aggression.",
    avatar: { initials: "SA", color: "#086aec" },
    backend: "lag",
  },
  {
    id: "david",
    name: "David",
    style: "Tight-Passive",
    description: "Very selective with hands, rarely raises, and calls rather than betting out.",
    avatar: { initials: "DV", color: "#7b1fa2" },
    backend: "tight_passive",
  },
  {
    id: "emma",
    name: "Emma",
    style: "Loose-Passive",
    description: "Loves to see flops and mostly calls; lets others take the lead in betting.",
    avatar: { initials: "EM", color: "#c62828" },
    backend: "loose_passive",
  },
];

const STORAGE_KEY = "icm_bot_profile";

export function getSelectedProfileId(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}

export function getSelectedProfile(): BotProfile | null {
  const id = getSelectedProfileId();
  return BOT_PROFILES.find((p) => p.id === id) ?? null;
}

export function setSelectedProfileId(id: string): void {
  localStorage.setItem(STORAGE_KEY, id);
}

export function clearSelectedProfile(): void {
  localStorage.removeItem(STORAGE_KEY);
}
