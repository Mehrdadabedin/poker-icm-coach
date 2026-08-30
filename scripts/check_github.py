"""Repository readiness audit (Atomic Part 036/037): structure, hygiene, README."""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ERRORS = []


def check(condition: bool, message: str) -> None:
    if not condition:
        ERRORS.append(message)


def main() -> int:
    check((ROOT / "README.md").is_file(), "README.md missing")
    readme = (ROOT / "README.md").read_text() if (ROOT / "README.md").is_file() else ""
    for section in ["Architecture", "Technology stack", "How to run locally", "Project status"]:
        check(section in readme, f"README missing section: {section}")
    check((ROOT / "progress.md").is_file(), "progress.md missing")
    check((ROOT / "docker-compose.yml").is_file(), "docker-compose.yml missing")
    check((ROOT / ".env.example").is_file(), ".env.example missing")
    check("DATABASE_URL" in (ROOT / ".env.example").read_text(), ".env.example missing DATABASE_URL")
    plans = sorted((ROOT / "plans").glob("*.md"))
    check(len(plans) >= 36, f"expected >= 36 plan files, found {len(plans)}")
    for plan in plans:
        head = plan.read_text().split("---")[1] if plan.read_text().startswith("---") else ""
        check("status:" in head, f"{plan.name} lacks status in frontmatter")
    gitignore = (ROOT / ".gitignore").read_text()
    for needle in [".env", "node_modules", ".venv", "__pycache__", "dist"]:
        check(needle in gitignore, f".gitignore missing {needle}")
    check(not (ROOT / ".env").exists(), ".env must not be committed")
    check((ROOT / ".github" / "workflows" / "ci.yml").is_file(), "CI workflow missing")
    check((ROOT / "docs" / "android.md").is_file(), "docs/android.md missing")
    # line limit audit
    for ext in ("py", "ts", "tsx", "css"):
        for path in list((ROOT / "backend").rglob(f"*.{ext}")) + list((ROOT / "frontend").rglob(f"*.{ext}")):
            if any(part in {".venv", ".venv-rooted", "node_modules", "dist", ".git", "__pycache__", "android"}
                   for part in path.parts):
                continue
            lines = path.read_text().splitlines()
            check(len(lines) <= 200, f"{path} exceeds 200 lines ({len(lines)})")
    if ERRORS:
        print("AUDIT FAILED:")
        for error in ERRORS:
            print(" -", error)
        return 1
    print("AUDIT PASSED")
    return 0


if __name__ == "__main__":
    sys.exit(main())
