import { useT } from "../i18n/I18n";
import { MinimalCard, type CardContent } from "./MinimalCard";

/** One row of three feature cards. */
const FEATURES: CardContent[] = [
  {
    id: "coach",
    title: "landing.feature.coach.title",
    text: "landing.feature.coach.text",
    icon: (
      <>
        <path d="M4 5h16v11h-9l-4 4v-4H4z" />
        <path d="M8.5 10.5l2.2 2.2 4.3-4.3" />
      </>
    ),
  },
  {
    id: "mistakes",
    title: "landing.feature.mistakes.title",
    text: "landing.feature.mistakes.text",
    icon: (
      <>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="M15.5 15.5L20 20" />
        <path d="M10.5 8v3.2" />
        <path d="M10.5 13.6h.01" />
      </>
    ),
  },
  {
    id: "calculator",
    title: "landing.feature.calculator.title",
    text: "landing.feature.calculator.text",
    icon: (
      <>
        <rect x="5" y="3" width="14" height="18" rx="2" />
        <path d="M8 7h8" />
        <path d="M8.5 12h.01M12 12h.01M15.5 12h.01M8.5 16h.01M12 16h.01M15.5 16h.01" />
      </>
    ),
  },
];

export function MinimalFeatures() {
  const t = useT();
  return (
    <section className="lm-features-wrap" aria-label={t("landing.features")} data-testid="minimal-features">
      <ul className="lm-cards">
        {FEATURES.map((feature) => (
          <MinimalCard key={feature.id} card={feature} heading="h2" testId={`minimal-feature-${feature.id}`} />
        ))}
      </ul>
    </section>
  );
}
