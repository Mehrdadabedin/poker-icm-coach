import { coachReason, actionWord } from "../i18n/coach";
import { useT } from "../i18n/I18n";
import { CoachReason } from "./CoachReason";
import { GlossaryTerm } from "./GlossaryTerm";
import { TERMS_FOR, choiceLabel } from "./quizText";
import { nameKey } from "../glossary/terms";
import type { Answer, Choice, Question } from "../services/quizApi";

/** The choices, and after the player picks one the coach's verdict with its
 * reason and glossary terms (plan 110). The answer arrives only in `answer`. */
export function QuizAnswer({ question, answer, busy, onPick, onNext }: {
  question: Question;
  answer: Answer | null;
  busy: boolean;
  onPick: (choice: Choice) => void;
  onNext: () => void;
}) {
  const t = useT();
  if (!answer) {
    return (
      <div className="quiz-choices" data-testid="quiz-choices">
        {question.choices.map((choice) => (
          <button key={choice} type="button" className="btn quiz-choice" disabled={busy}
            onClick={() => onPick(choice)} data-testid={`quiz-choice-${choice}`}>
            {choiceLabel(choice, t)}
          </button>
        ))}
      </div>
    );
  }
  const reason = coachReason(answer, t);
  return (
    <div className={`quiz-result ${answer.correct ? "quiz-right" : "quiz-wrong"}`} data-testid="quiz-result" role="status">
      <h2 className="quiz-verdict" data-testid="quiz-verdict">{t(answer.correct ? "quiz.right" : "quiz.wrong")}</h2>
      <p>{t("quiz.coachSays", { action: choiceLabel(answer.answer, t), word: actionWord(answer.action, t) })}</p>
      {answer.alsoPlayed && <p className="note">{t("quiz.also", { action: choiceLabel(answer.alsoPlayed, t) })}</p>}
      <p className="quiz-reason" data-testid="quiz-reason"><CoachReason text={reason} cards={question.cards} /></p>
      <p className="note quiz-terms">
        {t("quiz.terms")}{" "}
        {TERMS_FOR[question.situation.template].map((id) => (
          <span key={id} className="quiz-term"><GlossaryTerm id={id}>{t(nameKey(id))}</GlossaryTerm></span>
        ))}
      </p>
      <button type="button" className="btn btn-primary" onClick={onNext} data-testid="quiz-next">{t("quiz.next")}</button>
    </div>
  );
}
