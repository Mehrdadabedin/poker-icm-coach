import { useT } from "../i18n/I18n";
import { MinimalCard, type CardContent } from "./MinimalCard";

/** How it works: the current landing page's three steps, as cards with an
 * icon each instead of a number. The list is an <ol>, so the order is still
 * announced to screen readers. */
const STEPS: CardContent[] = [
  {
    id: "signup",
    title: "landing.how.signup.title",
    text: "landing.how.signup.text",
    icon: (
      <>
        <circle cx="9" cy="8" r="4" />
        <path d="M2 21v-1a7 7 0 0 1 14 0v1" />
        <path d="M19 8v6M16 11h6" />
      </>
    ),
  },
  {
    id: "opponents",
    title: "landing.how.choose.title",
    text: "landing.how.choose.text",
    icon: (
      <>
        <rect x="4" y="8" width="16" height="12" rx="3" />
        <path d="M12 8V5" />
        <circle cx="12" cy="3.5" r="1.5" />
        <circle cx="9" cy="13" r="1.25" />
        <circle cx="15" cy="13" r="1.25" />
        <path d="M9.5 17h5" />
      </>
    ),
  },
  {
    id: "graded",
    title: "landing.how.play.title",
    text: "landing.how.play.text",
    icon: (
      <>
        <rect x="5" y="4" width="14" height="17" rx="2" />
        <rect x="9" y="2.5" width="6" height="3" rx="1" />
        <path d="M9 13l2 2 4-4" />
      </>
    ),
  },
];

export function MinimalHow() {
  const t = useT();
  return (
    <section className="lm-how" aria-labelledby="lm-how-title" data-testid="minimal-how">
      <h2 className="lm-how-title" id="lm-how-title">{t("landing.how")}</h2>
      <ol className="lm-cards">
        {STEPS.map((step) => (
          <MinimalCard key={step.id} card={step} heading="h3" testId={`minimal-step-${step.id}`} />
        ))}
      </ol>
    </section>
  );
}
