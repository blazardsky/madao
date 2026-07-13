#!/usr/bin/env bash
set -euo pipefail

BUMP="${1:-}"
MSG="${2:-}"

usage() {
	echo "Usage: pnpm ship <patch|minor|major> \"changelog message\""
	exit 1
}

[[ -n "$BUMP" && -n "$MSG" ]] || usage
[[ "$BUMP" =~ ^(patch|minor|major)$ ]] || usage

echo "→ Formatting, linting, and building..."
pnpm format
pnpm lint
pnpm build

CHANGESET_FILE=".changeset/ship-$(date +%s).md"
cat > "$CHANGESET_FILE" <<EOF
---
"astro-madao": $BUMP
---

$MSG
EOF

echo "→ Bumping version from changeset..."
pnpm run version
pnpm build

VERSION=$(node -p "require('./package.json').version")

echo "→ Committing v$VERSION..."
git add -A
if git diff --cached --quiet; then
	echo "Nothing to commit."
	exit 1
fi
git commit -m "release: v$VERSION

$MSG"

echo "→ Publishing to npm..."
pnpm exec changeset publish

echo ""
echo "Done! astro-madao@$VERSION published."
echo "Run: git push && git push --tags"
