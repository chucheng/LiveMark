#!/usr/bin/env bash
set -euo pipefail

echo "Building LiveMark .dmg..."
pnpm tauri build --bundles dmg

DMG=$(find src-tauri/target/release/bundle/dmg -name '*.dmg' -type f | head -1)

if [ -n "$DMG" ]; then
  echo ""
  echo "Done: $DMG"
  echo "Size: $(du -h "$DMG" | cut -f1)"
else
  echo "Build failed — no .dmg found."
  exit 1
fi
