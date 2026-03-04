#!/bin/bash
# Downloads the latest consumables JSON from GitHub Pages into public/ for local development.
# Run this script whenever the game data is updated.
set -e

DEST="public/icarus_consumables.min.json"
URL="https://mikesingularity.github.io/icarus-consumables-data/icarus_consumables.min.json"

echo "Fetching $URL ..."
curl -fsSL "$URL" -o "$DEST"
echo "Saved to $DEST"
