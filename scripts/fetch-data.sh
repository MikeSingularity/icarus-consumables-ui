#!/bin/bash
# Downloads the latest consumables JSON from GitHub Pages into public-dev/ for local development.
# Run this script whenever the game data is updated.
set -e

DEST="public-dev/icarus_consumables.min.json"
URL="https://mikesingularity.github.io/icarus-consumables-data/icarus_consumables.min.json"

mkdir -p public-dev
echo "Fetching $URL ..."
curl -fsSL "$URL" -o "$DEST"
echo "Saved to $DEST"
