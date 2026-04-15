#!/usr/bin/env bash
# Installs the /crossmint-defindex Claude Code skill globally.
# After running this, /crossmint-defindex is available in any Claude Code session.

set -euo pipefail

SKILL_SRC=".claude/skills/crossmint-defindex.md"
SKILL_DST="$HOME/.claude/skills/crossmint-defindex.md"

if [ ! -f "$SKILL_SRC" ]; then
  echo "Error: run this script from the root of the crossmint-defindex-guide repo."
  exit 1
fi

mkdir -p "$HOME/.claude/skills"
cp "$SKILL_SRC" "$SKILL_DST"
echo "Installed: $SKILL_DST"
echo "Invoke in any Claude Code session with: /crossmint-defindex"
