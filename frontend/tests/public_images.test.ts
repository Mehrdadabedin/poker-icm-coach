import { readdirSync, readFileSync, statSync } from "fs";
import { join, relative, resolve } from "path";

const ROOT = resolve(__dirname, "..");
const IMAGES = join(ROOT, "public/images");

// Pictures nothing names today, kept until the owner decides. A new picture is
// not allowed here without a reason: delete it instead.
const KEPT_UNUSED: Record<string, string> = {
  "tournament-champion.webp": "WebP twin of the PNG the winner screen uses; nothing loads it",
  "bot-profiles/alex.webp": "WebP twin of the PNG portrait botProfiles.ts names; nothing loads it",
  "bot-profiles/sarah.webp": "WebP twin of the PNG portrait botProfiles.ts names; nothing loads it",
  "bot-profiles/david.webp": "WebP twin of the PNG portrait botProfiles.ts names; nothing loads it",
  "bot-profiles/emma.webp": "WebP twin of the PNG portrait botProfiles.ts names; nothing loads it",
};

const filesUnder = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? filesUnder(path) : [path];
  });

describe("pictures in public/images (plan 104)", () => {
  it("every picture is named in the code or in index.html, so unused ones cannot pile up", () => {
    const code = [...filesUnder(join(ROOT, "src")), join(ROOT, "index.html")]
      .map((file) => readFileSync(file, "utf8"))
      .join("\n");
    const unused = filesUnder(IMAGES)
      .map((file) => relative(IMAGES, file))
      .filter((name) => !code.includes(name.split("/").pop() as string))
      .filter((name) => !(name in KEPT_UNUSED));
    expect(unused).toEqual([]);
  });
});
