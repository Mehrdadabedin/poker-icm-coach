#!/usr/bin/env bash
# Decide the version, the tag and the mode of a release before anything mutates.
# The workflow calls this and computes nothing itself, so what CI does and what
# a local dry run does cannot drift apart.
#
# Environment: BUMP (patch|minor|major), REMOTE (default origin), GH_TOKEN for gh.
# Outputs version/tag/mode/ref/assets on stdout and, when set, to $GITHUB_OUTPUT.
set -euo pipefail

BUMP="${BUMP:-patch}"
REMOTE="${REMOTE:-origin}"
SEMVER_TAG='^v[0-9]+\.[0-9]+\.[0-9]+$'

fail() { printf 'error: %s\n' "$*" >&2; exit 1; }

# The asset set is named here because the plan has to judge whether an existing
# release is complete, and the workflow has to upload exactly that set.
expected_assets() {
  local v="$1"
  printf '%s\n' \
    "poker_icm_coach_backend-${v}-py3-none-any.whl" \
    "poker_icm_coach_backend-${v}.tar.gz" \
    "backend-wheels.zip" \
    "frontend-dist-${v}.zip" \
    "frontend-dist.zip" \
    "SHA256SUMS.txt"
}

bump_tag() {
  local tag="$1" major minor patch
  [[ "$tag" =~ ^v([0-9]+)\.([0-9]+)\.([0-9]+)$ ]] || fail "cannot parse tag: $tag"
  major="${BASH_REMATCH[1]}"; minor="${BASH_REMATCH[2]}"; patch="${BASH_REMATCH[3]}"
  case "$BUMP" in
    major) major=$((major + 1)); minor=0; patch=0 ;;
    minor) minor=$((minor + 1)); patch=0 ;;
    patch) patch=$((patch + 1)) ;;
    *) fail "unknown bump: $BUMP" ;;
  esac
  printf 'v%s.%s.%s' "$major" "$minor" "$patch"
}

# published | draft | none
release_state() {
  local out
  if ! out=$(gh release view "$1" --json isDraft --jq '.isDraft' 2>/dev/null); then
    printf 'none'
  elif [ "$out" = "true" ]; then
    printf 'draft'
  else
    printf 'published'
  fi
}

missing_assets() {
  local tag="$1" version="$2" have name missing=()
  have=$(gh release view "$tag" --json assets --jq '.assets[].name' 2>/dev/null || true)
  while read -r name; do
    grep -qxF "$name" <<<"$have" || missing+=("$name")
  done < <(expected_assets "$version")
  printf '%s' "${missing[*]:-}"
}

# A remote tag somebody else pushed is as real as a local one: bumping past it
# would hand two different commits the same version.
if git remote get-url "$REMOTE" >/dev/null 2>&1; then
  git fetch --tags --force --quiet "$REMOTE"
  remote_tags=$(git ls-remote --tags --refs "$REMOTE" 'v*' | sed 's#.*refs/tags/##')
else
  remote_tags=""
fi
local_tags=$(git tag --list 'v*' --sort=-version:refname)

# Fail loudly rather than let a naive parse of v2-beta produce a garbage version.
stray=$(printf '%s\n%s\n' "$local_tags" "$remote_tags" | grep -v '^$' | grep -Ev "$SEMVER_TAG" | sort -u || true)
[ -z "$stray" ] || fail "non-semver tags match the v* glob: $(tr '\n' ' ' <<<"$stray")"

# --sort=-version:refname, not the lexical default, or v0.10.0 loses to v0.9.0.
latest=$(head -1 <<<"$local_tags")
head_commit=$(git rev-parse HEAD)

if [ -z "$latest" ]; then
  tag=$(bump_tag "v0.0.0")
  mode="new"
else
  state=$(release_state "$latest")
  latest_commit=$(git rev-parse "${latest}^{commit}")
  if [ "$state" = "published" ]; then
    missing=$(missing_assets "$latest" "${latest#v}")
    [ -z "$missing" ] || fail "release $latest is published but missing assets ($missing); \
publishing over it would replace a release people already downloaded, fix it by hand"
    if [ "$latest_commit" = "$head_commit" ]; then
      tag="$latest"; mode="verify"
    else
      tag=$(bump_tag "$latest"); mode="new"
    fi
  else
    # The tag exists and the release does not, or is still a draft: an earlier
    # run stopped partway. Repair that tag, never bump past it.
    tag="$latest"; mode="recover"
  fi
fi

# A draft with no tag comes from a cancelled run or a hand-made draft. Reuse it
# instead of leaving two drafts on the same tag.
if [ "$mode" = "new" ] && [ "$(release_state "$tag")" != "none" ]; then
  mode="recover"
fi

version="${tag#v}"
# Build from the tag when one exists, so a repair rebuilds what was tagged and
# not whatever main has grown since. A draft with no tag still builds from HEAD.
if git rev-parse -q --verify "refs/tags/${tag}" >/dev/null; then
  ref="$tag"
else
  ref="$head_commit"
fi
assets=$(expected_assets "$version" | tr '\n' ' ')

printf 'mode=%s\n' "$mode"
printf 'tag=%s\n' "$tag"
printf 'version=%s\n' "$version"
printf 'ref=%s\n' "$ref"
printf 'previous=%s\n' "${latest:-none}"
printf 'assets=%s\n' "${assets% }"

if [ -n "${GITHUB_OUTPUT:-}" ]; then
  {
    printf 'mode=%s\n' "$mode"
    printf 'tag=%s\n' "$tag"
    printf 'version=%s\n' "$version"
    printf 'ref=%s\n' "$ref"
    printf 'assets=%s\n' "${assets% }"
  } >>"$GITHUB_OUTPUT"
fi
