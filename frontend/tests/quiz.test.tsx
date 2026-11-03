/* The quiz page (plan 110): face-down cards, one tap, the coach's verdict. */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { I18nProvider } from "../src/i18n/I18n";
import { en } from "../src/i18n/messages/en";
import { es } from "../src/i18n/messages/es";
import { QuizPage } from "../src/pages/QuizPage";
import type { Answer, Question } from "../src/services/quizApi";
import { RateLimitError } from "../src/services/rateLimit";

const { newQuestion, sendAnswer } = vi.hoisted(() => ({ newQuestion: vi.fn(), sendAnswer: vi.fn() }));
vi.mock("../src/services/quizApi", () => ({ newQuestion, sendAnswer }));

const TODAY = { answered: 0, correct: 0, bestStreak: 0, streak: 0, goal: 20, level: "easy" as const };
const question = (id: string, back: "red" | "blue" = "red"): Question => ({
  id, back, today: TODAY, choices: ["fold", "raise", "allin"],
  cards: [{ rank: "A", suit: "s" }, { rank: "K", suit: "s" }],
  situation: { template: "bubble", position: "BTN", playersLeft: 4, paidPlaces: 3, stackBb: 12, bigBlind: 1000,
    smallBlind: 500, ante: 100, allInBb: null, allInPosition: null },
});
const ANSWER: Answer = {
  correct: true, answer: "allin", action: "OPEN JAM", alsoPlayed: "raise", confidence: 0.8,
  reasoning: "AKs is in the jam range.", reasonCode: "jam_in", reasonParams: { hand: "AKs", depth: "12 BB", share: "30%" },
  today: { ...TODAY, answered: 1, correct: 1, streak: 1, bestStreak: 1 },
};

function open(lang: "en" | "es" = "en") {
  return render(<I18nProvider initial={lang}><MemoryRouter><QuizPage /></MemoryRouter></I18nProvider>);
}
const settle = () => act(async () => undefined);
const mockMotion = (reduce: boolean) => vi.stubGlobal("matchMedia", (q: string) => ({ matches: reduce && q.includes("reduce") }));

beforeEach(() => {
  vi.clearAllMocks();
  mockMotion(false);
  newQuestion.mockResolvedValue(question("q1"));
  sendAnswer.mockResolvedValue(ANSWER);
});

describe("the cards", () => {
  it.each(["red", "blue"] as const)("start face down with the %s back, and no situation or choices", async (back) => {
    newQuestion.mockResolvedValue(question("q1", back));
    open();
    await settle();
    expect(screen.getByTestId("quiz-cards")).toHaveAttribute("data-face-up", "false");
    expect(screen.getAllByTestId("quiz-back")).toHaveLength(2);
    expect(screen.getAllByTestId("quiz-back")[0].getAttribute("src")).toContain(`cards/quiz-back-${back}.png`);
    expect(screen.queryByTestId("quiz-situation")).toBeNull();
    expect(screen.queryByTestId("quiz-choices")).toBeNull();
  });

  it("turn over together on one tap and show the situation and the choices", async () => {
    open();
    await settle();
    fireEvent.click(screen.getByRole("button", { name: "Show the cards" }));
    expect(screen.getByTestId("quiz-cards")).toHaveAttribute("data-face-up", "true");
    expect(screen.getByTestId("quiz-cards")).not.toHaveClass("quiz-instant");
    expect(screen.getByTestId("quiz-situation").textContent).toContain("Bubble: 4 players left, 3 paid");
    expect(screen.getByTestId("quiz-situation").textContent).toContain("on the button (BTN) with 12 big blinds");
    expect(screen.getAllByTestId(/^quiz-choice-/)).toHaveLength(3);
  });

  it("turn over at once with reduced motion", async () => {
    mockMotion(true);
    open();
    await settle();
    expect(screen.getByTestId("quiz-cards")).toHaveClass("quiz-instant");
    fireEvent.click(screen.getByTestId("quiz-cards"));
    expect(screen.getByTestId("quiz-cards")).toHaveAttribute("data-face-up", "true");
  });

  it("turn over from the keyboard with Enter or Space", async () => {
    for (const key of ["{Enter}", " "]) {
      const { unmount } = open();
      await settle();
      screen.getByTestId("quiz-cards").focus();
      await userEvent.keyboard(key);
      expect(screen.getByTestId("quiz-cards")).toHaveAttribute("data-face-up", "true");
      unmount();
    }
  });
});

describe("an answer", () => {
  it("shows the coach's verdict and reason, and Next deals a new face-down pair", async () => {
    open();
    await settle();
    fireEvent.click(screen.getByTestId("quiz-cards"));
    fireEvent.click(screen.getByTestId("quiz-choice-allin"));
    await settle();
    expect(sendAnswer).toHaveBeenCalledWith("q1", "allin");
    expect(screen.getByTestId("quiz-verdict").textContent).toBe("Right");
    expect(screen.getByTestId("quiz-reason").textContent).toContain("jam");
    expect(screen.getByTestId("quiz-progress").textContent).toContain("Today: 1 of 20");
    expect(screen.queryByTestId("quiz-choices")).toBeNull();

    newQuestion.mockResolvedValue(question("q2", "blue"));
    fireEvent.click(screen.getByTestId("quiz-next"));
    await settle();
    expect(screen.getByTestId("quiz-cards")).toHaveAttribute("data-face-up", "false");
    expect(screen.getByTestId("quiz-cards")).toHaveAttribute("data-back", "blue");
    expect(screen.queryByTestId("quiz-result")).toBeNull();
  });

  it("says how long to wait when the server limits the player", async () => {
    newQuestion.mockRejectedValue(new RateLimitError(120));
    open();
    await settle();
    expect(screen.getByTestId("quiz-problem").textContent).toContain("try again in 2 min");
  });

  it("is in Spanish when the page is", async () => {
    open("es");
    await settle();
    fireEvent.click(screen.getByRole("button", { name: "Mostrar las cartas" }));
    expect(screen.getByTestId("quiz-situation").textContent).toContain("Burbuja: quedan 4 jugadores");
    expect(screen.getByTestId("quiz-choice-fold").textContent).toBe("Retirarse");
  });
});

const quizKeys = (messages: Record<string, string>) => Object.keys(messages).filter((k) => k.startsWith("quiz.") || k === "home.quiz.title" || k === "home.quiz.text").sort();
const holes = (text: string) => (text.match(/\{\w+\}/g) ?? []).sort();

describe("the words", () => {
  it("English and Spanish have the same quiz keys and placeholders", () => {
    expect(quizKeys(es)).toEqual(quizKeys(en));
    for (const key of quizKeys(en)) {
      expect(holes((es as Record<string, string>)[key]), key).toEqual(holes((en as Record<string, string>)[key]));
    }
  });
});
