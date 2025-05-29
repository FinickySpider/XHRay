#!/bin/bash
# Seed common GitHub issue labels using the gh CLI
# Requires: gh CLI logged in (`gh auth login`)

REPO="FinickySpider/XHRay"

LABELS=(
  "feature:New features|0e8a16"
  "bug:Fixes|d73a4a"
  "refactor:Code cleanup|c2e0c6"
  "docs:Documentation|0075ca"
  "chore:Meta tasks|fbca04"
  "ci:Build & deploy|5319e7"
)

for entry in "${LABELS[@]}"; do
  IFS="|" read -r name color <<< "$entry"
  gh label create "$name" --color "$color" --repo "$REPO" || gh label edit "$name" --color "$color" --repo "$REPO"
done

echo "✅ GitHub labels seeded/updated."