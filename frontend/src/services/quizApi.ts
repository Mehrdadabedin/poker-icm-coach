/* The quiz API (plan 110). A question holds no answer: it arrives with the
 * player's choice, in the reply to POST /api/quiz/answer. */
import { request } from "./api";
import type { Card } from "../models/game";

export type Choice = "fold" | "call" | "raise" | "allin";
export type Level = "easy" | "medium" | "hard";
export type Template = "push_fold" | "call_allin" | "bubble" | "pay_jump" | "open_position";

export interface Situation {
  template: Template;
  position: string;
  playersLeft: number;
  paidPlaces: number;
  stackBb: number;
  bigBlind: number;
  smallBlind: number;
  ante: number;
  allInBb: number | null;
  allInPosition: string | null;
  bigBlindStackBb?: number | null;
}

export interface Today {
  answered: number;
  correct: number;
  bestStreak: number;
  streak: number;
  goal: number;
  level: Level;
}

export interface Question {
  id: string;
  cards: Card[];
  back: "red" | "blue";
  situation: Situation;
  choices: Choice[];
  today: Today;
}

export interface Answer {
  correct: boolean;
  answer: Choice;
  action: string;
  alsoPlayed: Choice | null;
  confidence: number;
  reasoning: string;
  reasonCode: string;
  reasonParams: Record<string, string>;
  today: Today;
}

export const newQuestion = () => request<Question>("/api/quiz/question", { method: "POST" });

export const sendAnswer = (id: string, choice: Choice) =>
  request<Answer>("/api/quiz/answer", { method: "POST", body: JSON.stringify({ id, choice }) });
