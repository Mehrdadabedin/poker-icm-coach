import { useCallback, useEffect, useState } from "react";
import { Copyright } from "../components/Copyright";
import { PageHeader } from "../components/PageHeader";
import { QuizAnswer } from "../components/QuizAnswer";
import { QuizCards } from "../components/QuizCards";
import { situationText } from "../components/quizText";
import { useT } from "../i18n/I18n";
import { minutesToWait, RateLimitError } from "../services/rateLimit";
import { newQuestion, sendAnswer, type Answer, type Choice, type Question, type Today } from "../services/quizApi";
import type { MessageKey } from "../i18n/messages/en";

type Problem = { kind: "wait"; minutes: number } | { kind: "failed" };

function Progress({ today }: { today: Today }) {
  const t = useT();
  return (
    <div className="quiz-progress" data-testid="quiz-progress">
      <span>{t("quiz.today", { answered: today.answered, goal: today.goal })}</span>
      <span>{t("quiz.correct", { correct: today.correct })}</span>
      <span>{t("quiz.streak", { streak: today.streak, best: today.bestStreak })}</span>
      <span>{t("quiz.level", { level: t(`quiz.level.${today.level}` as MessageKey) })}</span>
      {today.answered >= today.goal && <b className="quiz-goal" data-testid="quiz-goal">{t("quiz.goalDone")}</b>}
    </div>
  );
}

/** QUIZ (plan 110): two face-down cards, a tap turns them over, the player picks
 * an action and the coach says whether it was right and why. */
export function QuizPage() {
  const t = useT();
  const [question, setQuestion] = useState<Question | null>(null);
  const [today, setToday] = useState<Today | null>(null);
  const [faceUp, setFaceUp] = useState(false);
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<Problem | null>(null);

  const fail = (e: unknown) => setProblem(e instanceof RateLimitError ? { kind: "wait", minutes: minutesToWait(e) } : { kind: "failed" });

  const deal = useCallback(async () => {
    setBusy(true);
    setProblem(null);
    try {
      const next = await newQuestion();
      setQuestion(next);
      setToday(next.today);
      setFaceUp(false);
      setAnswer(null);
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => { void deal(); }, [deal]);

  const pick = async (choice: Choice) => {
    if (!question) return;
    setBusy(true);
    setProblem(null);
    try {
      const graded = await sendAnswer(question.id, choice);
      setAnswer(graded);
      setToday(graded.today);
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page quiz-page" data-testid="quiz-page">
      <PageHeader />
      <h1 className="screen-title">{t("quiz.title")}</h1>
      {today && <Progress today={today} />}
      {problem && (
        <p className="note" role="alert" data-testid="quiz-problem">
          {problem.kind === "wait" ? t("quiz.tooMany", { minutes: problem.minutes }) : t("quiz.failed")}{" "}
          <button type="button" className="btn" onClick={() => void deal()}>{t("quiz.retry")}</button>
        </p>
      )}
      {question && (
        <section className="quiz-question">
          <QuizCards key={question.id} cards={question.cards} back={question.back} faceUp={faceUp} onFlip={() => setFaceUp(true)} />
          {faceUp ? (
            <>
              <p className="quiz-situation" data-testid="quiz-situation">{situationText(question.situation, t)}</p>
              <QuizAnswer question={question} answer={answer} busy={busy} onPick={(c) => void pick(c)} onNext={() => void deal()} />
            </>
          ) : (
            <p className="note">{t("quiz.tapHint")}</p>
          )}
        </section>
      )}
      <Copyright />
    </div>
  );
}
