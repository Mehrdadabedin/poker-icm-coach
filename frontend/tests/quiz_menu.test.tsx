/* The quiz entry in the menus (plan 110). */
import { describe, expect, it } from "vitest";
import { currentTab } from "../src/components/TabBar";
import { STUDY } from "../src/components/menuEntries";

describe("the menu", () => {
  it("has a Pro Quiz card in Study and keeps the Learn tab lit on the quiz page", () => {
    expect(STUDY.find((entry) => entry.to === "/quiz")).toMatchObject({ pro: true, testId: "menu-quiz" });
    expect(currentTab("/quiz")).toBe("learn");
  });
});
