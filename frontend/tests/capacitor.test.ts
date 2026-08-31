import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

describe("Capacitor configuration", () => {
  it("has a valid capacitor config file", () => {
    const path = resolve(__dirname, "../capacitor.config.ts");
    const text = readFileSync(path, "utf8");
    expect(text).toContain("appId");
    expect(text).toContain("webDir");
  });

  it("defines the app id and name", () => {
    const text = readFileSync(resolve(__dirname, "../capacitor.config.ts"), "utf8");
    expect(text).toContain("com.pokericmcoach.app");
    expect(text).toContain("ICM Master");
  });

  it("has android platform directory after cap add", () => {
    expect(existsSync(resolve(__dirname, "../android"))).toBe(true);
    expect(existsSync(resolve(__dirname, "../android/app"))).toBe(true);
  });

  it("has apk build scripts in package.json", () => {
    const pkg = JSON.parse(readFileSync(resolve(__dirname, "../package.json"), "utf8"));
    expect(pkg.scripts["apk:release"]).toContain("gradlew");
    expect(pkg.scripts["cap:sync"]).toContain("cap sync");
  });
});
