#!/bin/sh
# Enable this repository's git hooks. Run once per clone, git clone does not
# copy hooks.
set -eu
cd "$(git rev-parse --show-toplevel)"
git config core.hooksPath .githooks
echo "hooks enabled: pre-push runs every CI gate and blocks direct pushes to main."
