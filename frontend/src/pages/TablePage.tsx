import { ActionKind, LegalAction, TableState } from "../models/game";
import { PokerTable } from "../components/PokerTable";
import { HeroControls } from "../components/HeroControls";

interface TablePageProps {
  state: TableState;
  onAction: (kind: ActionKind, amount?: number) => void;
  legalActions?: LegalAction[];
  toCall?: number;
}

const DEFAULT_ACTIONS: LegalAction[] = [
  { kind: "fold" },
  { kind: "check" },
  { kind: "bet", minAmount: 100, maxAmount: 45000 },
  { kind: "all_in" },
];

/** Full table screen: poker table plus hero action controls. */
export function TablePage({ state, onAction, legalActions, toCall }: TablePageProps) {
  const hero = state.players.find((p) => p.isHero);

  return (
    <div className="table-page" data-testid="table-page">
      <h1 className="screen-title">POKER ICM COACH</h1>
      <PokerTable state={state}>
        <div className="hero-bar">
          <span className="hero-hand-label">
            HERO — {hero?.position ?? "?"} · {hero ? `${hero.stackInBB} BB` : ""}
          </span>
        </div>
        <HeroControls
          legalActions={legalActions ?? DEFAULT_ACTIONS}
          toCall={toCall ?? 0}
          pot={state.pot}
          stack={hero?.stack ?? 0}
          bigBlind={state.bigBlind}
          disabled={!state.waitingForHero}
          onAction={onAction}
        />
      </PokerTable>
    </div>
  );
}
