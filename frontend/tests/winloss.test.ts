import { describe, expect, it } from "vitest";
import { HandHistoryEntry } from "../src/models/game";
import { blindLevelStats, positionStats, winLossTotals } from "../src/models/winloss";

function hand(over: Partial<HandHistoryEntry>): HandHistoryEntry {
  return {
    handNumber: 1, heroPosition: "UTG", pot: 1000, winnerSeats: [0], stage: "",
    net: 0, heroDecision: null, coachRecommendation: null, grade: null,
    level: 1, blindLevel: "100/100", ...over,
  };
}

describe("winLossTotals (A18, real-data derivation)", () => {
  it("counts wins, losses, neutrals and the chip result", () => {
    const hands = [
      hand({ net: 1000 }), hand({ net: -500 }), hand({ net: -250 }),
      hand({ net: 0 }), hand({ net: 750 }),
    ];
    const stats = winLossTotals(hands);
    expect(stats.total).toBe(5);
    expect(stats.wins).toBe(2);
    expect(stats.losses).toBe(2);
    expect(stats.neutral).toBe(1);
    expect(stats.profit).toBe(1000);
    expect(stats.winRate).toBe(0.5);
    expect(stats.lossRate).toBe(0.5);
  });

  it("returns zero rates for an empty history", () => {
    const stats = winLossTotals([]);
    expect(stats).toEqual({ total: 0, wins: 0, losses: 0, neutral: 0, profit: 0, winRate: 0, lossRate: 0 });
  });
});

describe("blindLevelStats (A18)", () => {
  it("aggregates per level, win% + loss% = 100%, sorted by level", () => {
    const hands = [
      hand({ level: 3, net: -100 }), hand({ level: 1, net: 100 }), hand({ level: 1, net: 100 }),
      hand({ level: 1, net: -100, heroPosition: "BTN" }), hand({ level: 2, net: 50 }),
      hand({ level: 2, net: -50 }), hand({ level: 3, net: 250 }), hand({ level: 1, net: 100 }),
    ];
    const rows = blindLevelStats(hands);
    expect(rows.map((r) => r.level)).toEqual([1, 2, 3]);
    const [l1, l2, l3] = rows;
    expect([l1.wins, l1.losses]).toEqual([3, 1]);
    expect([l2.wins, l2.losses]).toEqual([1, 1]);
    expect([l3.wins, l3.losses]).toEqual([1, 1]);
    for (const row of rows) {
      expect(row.winRate + row.lossRate).toBeCloseTo(1);
    }
  });

  it("omits levels with no decisive hands instead of showing 0% / 0%", () => {
    const rows = blindLevelStats([hand({ level: 2, net: 0 }), hand({ level: 2, net: 0 })]);
    expect(rows).toEqual([]);
  });
});

describe("positionStats (A18)", () => {
  it("aggregates per hero position, ordered by the canonical seat order", () => {
    const hands = [
      hand({ heroPosition: "CO", net: 100 }), hand({ heroPosition: "UTG", net: -100 }),
      hand({ heroPosition: "CO", net: -100 }), hand({ heroPosition: "BB", net: 100 }),
      hand({ heroPosition: "MP", net: 100 }), hand({ heroPosition: "MP", net: 100 }),
      hand({ heroPosition: "MP", net: -100, level: 2 }),
    ];
    const rows = positionStats(hands);
    expect(rows.map((r) => r.position)).toEqual(["UTG", "MP", "CO", "BB"]);
    const mp = rows.find((r) => r.position === "MP");
    expect(mp?.wins).toBe(2);
    expect(mp?.losses).toBe(1);
    expect(mp?.winRate).toBeCloseTo(2 / 3);
  });

  it("puts unknown positions last and omits neutral-only positions", () => {
    const rows = positionStats([
      hand({ heroPosition: "??", net: 100 }),
      hand({ heroPosition: "UTG", net: 0 }),
    ]);
    expect(rows.map((r) => r.position)).toEqual(["??"]);
  });
});
