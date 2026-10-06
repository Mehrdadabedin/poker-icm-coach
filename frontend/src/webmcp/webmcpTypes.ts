import type { ActionKind, TableState } from "../models/game";

export type JsonSchema = {
  type: "object";
  properties: Record<string, { type: string; description?: string }>;
  required?: string[];
  additionalProperties?: boolean;
};

export type ToolContext = { signal: AbortSignal };

export type WebMcpTool = {
  name: string;
  description: string;
  inputSchema: JsonSchema;
  annotations?: { readOnlyHint?: boolean; untrustedContentHint?: boolean };
  execute: (input: Record<string, unknown>, context?: ToolContext) => unknown | Promise<unknown>;
};

export type ModelContext = {
  registerTool: (tool: WebMcpTool, options?: { signal?: AbortSignal }) => void | Promise<void>;
};

export type WebMcpDocument = { modelContext?: ModelContext };

export interface GameToolRegistration {
  ready: Promise<void>;
  cleanup: () => void;
}

export interface HandHistoryEntry {
  handNumber: number;
  heroPosition: string;
  pot: number;
  winnerSeats: number[];
  stage: string;
  net: number;
  heroDecision: string | null;
  coachRecommendation: string | null;
  grade: string | null;
  level: number;
  blindLevel: string;
}

export interface GameToolActions {
  tableId: string;
  getState: () => TableState | null;
  isPaused: () => boolean;
  countdown: () => number | null;
  isReviewOpen: () => boolean;
  act: (kind: ActionKind, amount?: number) => Promise<TableState | undefined>;
  nextHand: () => Promise<TableState>;
  startNewHand: () => Promise<TableState>;
  getHandHistory: () => Promise<HandHistoryEntry[]>;
  pause: () => void;
  resume: () => void;
  showHandResult: () => void;
}

export const noInput: JsonSchema = {
  type: "object",
  properties: {
    _: { type: "boolean", description: "Optional compatibility parameter; ignored by the tool." },
  },
  additionalProperties: false,
};

export const betInput: JsonSchema = {
  type: "object",
  properties: {
    amount: { type: "number", description: "Bet amount in chips." },
  },
  required: ["amount"],
  additionalProperties: false,
};
