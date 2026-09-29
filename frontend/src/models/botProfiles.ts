/** A26 — BOT profiles: four predefined human-style playing personalities.
 *
 * The profile selected on the BOT PROFILES screen is stored in localStorage
 * (the same client-side mechanism the app already uses for the auth token) and
 * passed to POST /api/tournament at table creation. Each profile maps to an
 * existing backend personality archetype (`backend`), so the bots' actual
 * decision behaviour comes from the existing AI personality engine.
 */

export interface BotAvatar {
  /** Portrait image path served from /images/bot-profiles/. */
  portrait: string;
  /** Distinct identity colour per profile (used for the avatar ring). */
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
    avatar: { portrait: "/images/bot-profiles/alex.png", color: "#2e7d32" },
    backend: "tag",
  },
  {
    id: "sarah",
    name: "Sarah",
    style: "Loose-Aggressive",
    description: "Involves herself in many pots and keeps the pressure on with frequent aggression.",
    avatar: { portrait: "/images/bot-profiles/sarah.png", color: "#086aec" },
    backend: "lag",
  },
  {
    id: "david",
    name: "David",
    style: "Tight-Passive",
    description: "Very selective with hands, rarely raises, and calls rather than betting out.",
    avatar: { portrait: "/images/bot-profiles/david.png", color: "#7b1fa2" },
    backend: "tight_passive",
  },
  {
    id: "emma",
    name: "Emma",
    style: "Loose-Passive",
    description: "Loves to see flops and mostly calls; lets others take the lead in betting.",
    avatar: { portrait: "/images/bot-profiles/emma.png", color: "#c62828" },
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


// ---- A27: opponent lineup (multi-BOT selection) -------------------------------

/** Maximum opponent bots for the 9-player tournament (1 human + 8 bots). */
export const MAX_BOTS = 8;

const LINEUP_KEY = "icm_bot_lineup";

/** Saved lineup as ordered backend personality names (seat 1..n), length <= 8. */
export function getLineup(): string[] {
  try {
    const raw = localStorage.getItem(LINEUP_KEY);
    if (!raw) return [];
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

export function getLineupTotal(): number {
  return getLineup().length;
}

/** Persist the lineup and clear the legacy single-profile so RANDOM stays
 * coherent with the last explicit choice. */
export function saveLineup(bots: string[]): void {
  localStorage.setItem(LINEUP_KEY, JSON.stringify(bots.slice(0, MAX_BOTS)));
  clearSelectedProfile();
}

export function clearLineup(): void {
  localStorage.removeItem(LINEUP_KEY);
}

/** Expand per-profile counts into an ordered lineup of backend names
 * (e.g. { alex: 2, sarah: 1, david: 3, emma: 2 } -> 8 entries). */
export function lineupFromCounts(counts: Record<string, number>): string[] {
  const lineup: string[] = [];
  for (const profile of BOT_PROFILES) {
    const count = counts[profile.id] ?? 0;
    for (let i = 0; i < count; i += 1) lineup.push(profile.backend);
  }
  return lineup;
}


/** Portrait + identity colour for a backend profile name (A35). Returns null
 * for unknown/random profiles so those seats keep the current presentation. */
export function botProfilePortrait(backend: string): { src: string; color: string; alt: string } | null {
  const profile = BOT_PROFILES.find((p) => p.backend === backend);
  return profile ? { src: profile.avatar.portrait, color: profile.avatar.color, alt: profile.name } : null;
}
