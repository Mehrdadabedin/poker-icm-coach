import type { ReactNode } from "react";

/** One quiet row of three features. The icons are inline SVG line drawings
 * that take their gold from CSS (currentColor) and add no image requests. */
interface Feature {
  id: string;
  title: string;
  text: string;
  icon: ReactNode;
}

const FEATURES: Feature[] = [
  {
    id: "coach",
    title: "Coach at every decision",
    text: "The move and the reason, before you act.",
    icon: (
      <>
        <path d="M4 5h16v11h-9l-4 4v-4H4z" />
        <path d="M8.5 10.5l2.2 2.2 4.3-4.3" />
      </>
    ),
  },
  {
    id: "mistakes",
    title: "Find your mistakes",
    text: "Every suboptimal decision, with why.",
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
    title: "ICM calculator",
    text: "What every stack is worth in prize money.",
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
  return (
    <section className="lm-features-wrap" aria-label="Features" data-testid="minimal-features">
      <ul className="lm-features">
        {FEATURES.map((feature) => (
          <li key={feature.id} className="lm-feature" data-testid={`minimal-feature-${feature.id}`}>
            <svg
              className="lm-feature-icon"
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
              {feature.icon}
            </svg>
            <div className="lm-feature-body">
              <h2 className="lm-feature-title">{feature.title}</h2>
              <p className="lm-feature-text">{feature.text}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
