import type { ReactNode } from "react";
import { useT } from "../i18n/I18n";
import type { MessageKey } from "../i18n/messages/en";

export interface CardContent {
  id: string;
  title: MessageKey;
  text: MessageKey;
  icon: ReactNode;
}

interface MinimalCardProps {
  card: CardContent;
  heading: "h2" | "h3";
  testId: string;
}

/** One white rounded card of the minimal landing, shared by How it works and
 * the features. The icon is an inline SVG line drawing that takes its amber
 * from CSS (currentColor) and adds no image request. */
export function MinimalCard({ card, heading: Title, testId }: MinimalCardProps) {
  const t = useT();
  return (
    <li className="lm-card" data-testid={testId}>
      <svg
        className="lm-card-icon"
        viewBox="0 0 24 24"
        width="28"
        height="28"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        {card.icon}
      </svg>
      <div className="lm-card-body">
        <Title className="lm-card-title">{t(card.title)}</Title>
        <p className="lm-card-text">{t(card.text)}</p>
      </div>
    </li>
  );
}
