#!/bin/bash
# Auto-generate CHANGELOG using conventional commits

npx auto-changelog --output CHANGELOG.md --tag-pattern "v[0-9]+\.[0-9]+.*" --starting-version 0.1.0