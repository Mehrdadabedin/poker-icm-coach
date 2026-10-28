import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { LiveTableView, type LiveTableViewProps } from "../src/components/LiveTableView";
import { I18nProvider } from "../src/i18n/I18n";
import type { CoachAdvice, TableState } from "../src/models/game";
import { sampleTableState } from "../src/sampleState";

export const advice: CoachAdvice = {
  recommendedAction: "RAISE", reasoning: "T9s is in the CO open range.", street: "preflop",
  detail: { "Pot odds": "31%", SPR: "4.2", "ICM pressure": "LOW" },
};
const noop = () => undefined;

/** jsdom has no CSS: the phone rule is the media query the hook reads. */
export function setUpright(on: boolean): void {
  window.matchMedia = ((media: string) => ({
    matches: on, media, addEventListener: noop, removeEventListener: noop,
  })) as unknown as typeof window.matchMedia;
}

export function view(state: Partial<TableState> = {}, extra: Partial<LiveTableViewProps> = {}, lang?: "en" | "es") {
  const props: LiveTableViewProps = {
    state: {
      ...sampleTableState(), waitingForHero: true, street: "preflop", communityCards: [],
      actionLog: [{ seat: 3, action: "raise", amount: 300, street: "preflop" }], ...state,
    },
    coach: advice, comparison: null, countdown: null, paused: false, acting: false, showLabels: false,
    showResultLabels: false, nameBySeat: new Map([[3, "Bot3"]]), coachCollapsed: false, historyCollapsed: false,
    reviewOpen: false, username: "Alice", onHome: noop, onMistakes: noop, onLogout: noop,
    onTogglePause: noop, onReview: noop, onNext: noop, onBackReview: noop, onAction: noop,
    onToggleCoach: noop, onToggleHistory: noop, ...extra,
  };
  const ui = (p: LiveTableViewProps) => (
    <I18nProvider initial={lang}><MemoryRouter><LiveTableView {...p} /></MemoryRouter></I18nProvider>
  );
  const out = render(ui(props));
  return { ...out, rerenderWith: (more: Partial<LiveTableViewProps>) => out.rerender(ui({ ...props, ...more })) };
}
