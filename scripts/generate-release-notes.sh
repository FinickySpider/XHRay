#!/bin/bash
# Generate a markdown summary of commits since the last tag

VERSION=$(git describe --tags --abbrev=0)
DATE=$(date +'%Y-%m-%d')
COMMITS=$(git log --pretty=format:"%s" $(git describe --tags --abbrev=0)^..HEAD)

echo "**Release: $VERSION**" > temp_release_notes.md
echo "**Date:** $DATE" >> temp_release_notes.md
echo >> temp_release_notes.md

echo "### ✨ Features" >> temp_release_notes.md
echo "$COMMITS" | grep -iE '^feat:|^feature:' || echo "- None" >> temp_release_notes.md
echo >> temp_release_notes.md

echo "### 🐛 Fixes" >> temp_release_notes.md
echo "$COMMITS" | grep -iE '^fix:' || echo "- None" >> temp_release_notes.md
echo >> temp_release_notes.md

echo "### 🧰 Other Changes" >> temp_release_notes.md
echo "$COMMITS" | grep -viE '^feat:|^fix:' || echo "- None" >> temp_release_notes.md
echo >> temp_release_notes.md

cat temp_release_notes.md
mv temp_release_notes.md release-notes.txt # final output written here
