#!/usr/bin/env bash
set -euo pipefail

if [ -n "$(git status --porcelain)" ]; then
  echo "Working tree is not clean. Commit or stash changes before building." >&2
  exit 1
fi

TAG="$(git rev-parse --short HEAD)"

TAG="$TAG" docker compose build

echo "Built kinetic-command:$TAG"
echo "Deploy it with: TAG=$TAG docker compose up -d"
