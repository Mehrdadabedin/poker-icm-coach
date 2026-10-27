/* The poker glossary (plan 097): every abbreviation and term the app shows a
 * player. The words live in messages/<lang>/glossary*.ts as gl.<id>.name,
 * gl.<id>.def and, where an example helps, gl.<id>.ex. */
import type { MessageKey } from "../i18n/messages/en";

export const GROUPS = ["positions", "actions", "coach", "tournament", "stats"] as const;
export type Group = (typeof GROUPS)[number];

export interface Term {
  id: string;
  group: Group;
  /** The short form as the app prints it ("CO", "SPR"); words have none. */
  abbr?: string;
}

const group = (g: Group, ids: string[], abbr: Record<string, string> = {}): Term[] =>
  ids.map((id) => ({ id, group: g, ...(abbr[id] ? { abbr: abbr[id] } : {}) }));

const POSITIONS = ["UTG", "UTG1", "MP", "LJ", "HJ", "CO", "BTN", "SB", "BB"];

export const TERMS: Term[] = [
  ...group("positions", POSITIONS, Object.fromEntries(POSITIONS.map((p) => [p, p === "UTG1" ? "UTG+1" : p]))),
  ...group("actions", ["fold", "check", "call", "bet", "raise", "minRaise", "allIn", "openRaise",
    "threeBet", "fourBet", "openJam", "reshove", "callJam", "streets"], { threeBet: "3-BET", fourBet: "4-BET" }),
  ...group("coach", ["range", "openRange", "jamRange", "nash", "steal", "premium", "handNotation", "equity",
    "potOdds", "ev", "chipEv", "icmEv", "foldEquity", "outs", "effectiveStack", "stackBand", "coverage",
    "spr", "boardTexture", "heroVillain", "grade", "leak"], { ev: "EV", spr: "SPR", icmEv: "ICM EV", chipEv: "CHIP EV" }),
  ...group("tournament", ["icm", "icmPressure", "riskPremium", "tournamentEquity", "prizePool", "bubble",
    "finalTable", "shortHanded", "headsUp", "blindLevel", "ante", "pot", "averageStack", "showdown", "walk",
    "chop"], { icm: "ICM" }),
  ...group("stats", ["vpip", "pfr", "cbet", "wtsd", "aggression", "avgPot", "bbWonLost", "chipPl",
    "agreement", "mistakesPer100", "averageFinish"], { vpip: "VPIP", pfr: "PFR", wtsd: "WTSD", avgPot: "AVG POT" }),
];

export const termById = new Map(TERMS.map((term) => [term.id, term]));

export const nameKey = (id: string) => `gl.${id}.name` as MessageKey;
export const defKey = (id: string) => `gl.${id}.def` as MessageKey;
export const exKey = (id: string) => `gl.${id}.ex` as MessageKey;

/** Abbreviations linked wherever the coach writes them, in any language. */
const TOKENS: Record<string, string> = {
  ...Object.fromEntries(POSITIONS.map((p) => [p === "UTG1" ? "UTG+1" : p, p])),
  ICM: "icm", SPR: "spr", EV: "ev", Nash: "nash",
};

// longest first, so UTG+1 wins over UTG; never inside a word or a number
export const TOKEN_PATTERN = new RegExp(
  `(?<![\\w+])(${Object.keys(TOKENS).sort((a, b) => b.length - a.length).map((k) => k.replace("+", "\\+")).join("|")})(?![\\w+])`,
);

export const tokenTerm = (token: string): string | undefined => TOKENS[token];

/** The coach's factor rows (server labels) that have an entry. */
export const ROW_TERM: Record<string, string> = {
  "EFFECTIVE STACK": "effectiveStack", "POT ODDS": "potOdds", "ICM PRESSURE": "icmPressure", BUBBLE: "bubble",
  "STACK BAND": "stackBand", "RISK PREMIUM": "riskPremium", COVERAGE: "coverage", SPR: "spr",
  "BOARD TEXTURE": "boardTexture", "EST. EQUITY": "equity", "CHIP EV": "chipEv", "ICM EV": "icmEv",
  "TOURNAMENT EQUITY": "tournamentEquity",
};

/** The Report's player stats (their keys) that have an entry. */
export const STAT_TERM: Record<string, string> = {
  vpip: "vpip", pfr: "pfr", threeBet: "threeBet", steal: "steal", cbet: "cbet", wtsd: "wtsd",
};

/** The anchor of an entry on the glossary page. */
export const termHref = (id: string) => `/glossary?term=${encodeURIComponent(id)}`;
