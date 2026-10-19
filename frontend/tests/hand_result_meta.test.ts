/* The hand result headline. The owner's hand #14 (19 Oct) won the whole main
 * pot while another player won a side pot, and read CHOPPED: now the backend
 * calls it a chop only for a tie, and the line names the other winner. */
import { describe, expect, it } from "vitest";
import type { HandReview } from "../src/models/game";
import { reviewResultMeta } from "../src/models/handResult";
import { sampleReview } from "../src/sampleState";

const seat = (s: number, name: string, isHero: boolean, won: boolean) => ({
  seat: s, name, cards: [], handName: null, isHero, won,
});

function review(over: Partial<HandReview>): HandReview {
  return { ...sampleReview(), ...over };
}

describe("hand result headline", () => {
  it("is a win that names who took the other pot", () => {
    const meta = reviewResultMeta(review({
      heroNet: 52_150, heroWon: true, chop: false,
      showdown: [seat(0, "Admin", true, true), seat(1, "Emma 1", false, true), seat(2, "Alex 2", false, false)],
    }));
    expect(meta.title).toBe("YOU WON");
    expect(meta.subtitle).toBe("+52,150 chips · Emma 1 won the other pot");
    expect(meta.glyph).toBe("✓");
  });

  it("stays plain when the hero won everything", () => {
    expect(reviewResultMeta(review({ heroNet: 3_400, heroWon: true, chop: false })).subtitle).toBe("+3,400 chips");
  });

  it("still says CHOPPED for a tie, and YOU LOST when the hero won nothing", () => {
    const tie = review({ heroNet: 100, heroWon: true, chop: true,
      showdown: [seat(0, "Admin", true, true), seat(1, "Emma 1", false, true)] });
    expect(reviewResultMeta(tie)).toMatchObject({ title: "CHOPPED", subtitle: "+100 chips" });
    const lost = review({ heroNet: -900, heroWon: false, chop: false,
      showdown: [seat(0, "Admin", true, false), seat(1, "Emma 1", false, true), seat(2, "Alex 2", false, true)] });
    expect(reviewResultMeta(lost)).toMatchObject({ title: "YOU LOST", subtitle: "-900 chips" });
  });
});
