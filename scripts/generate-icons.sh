#!/usr/bin/env bash
# generate-icons.sh — Regenerate all Leyline icon assets from source SVGs.
#
# Source files (edit these):
#   assets/icon.svg             — canonical icon design (dark bg + triangle + ghost point)
#   assets/glyph.svg            — 16x16 monochrome font glyph
#
# Generated outputs:
#   icon.png                    — 256x256 marketplace icon (PNG)
#   assets/walkthrough-icon.png — 64x64 walkthrough thumbnail (PNG)
#   assets/leyline.woff         — font used by the VS Code status bar icon
#   assets/leyline.json         — glyph codepoint map (generated)
#
# Requirements:
#   rsvg-convert  — brew install librsvg
#   bun           — https://bun.sh
#
# Usage:
#   bash scripts/generate-icons.sh
#   bun run generate-all-icons

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ASSETS="$REPO_ROOT/assets"

# ── Dependencies ─────────────────────────────────────────────────────────────

check_cmd() {
  if ! command -v "$1" &>/dev/null; then
    echo "❌  Missing: $1 ($2)"; exit 1
  fi
}
check_cmd rsvg-convert "brew install librsvg"
check_cmd bun          "https://bun.sh"
echo "✓  Dependencies OK"

# ── 1. icon.png + assets/walkthrough-icon.png (raster exports) ───────────────
# Both derived from assets/icon.svg — edit that file to change the design.

rsvg-convert -w 256 -h 256 "$ASSETS/icon.svg" -o "$REPO_ROOT/icon.png"
echo "✓  icon.png (256x256)"

rsvg-convert -w 64 -h 64 "$ASSETS/icon.svg" -o "$ASSETS/walkthrough-icon.png"
echo "✓  assets/walkthrough-icon.png (64x64)"

# ── 2. assets/leyline.woff + assets/leyline.json ─────────────────────────────
# fantasticon reads top-level SVGs in assets/ only (glyph.svg + icon.svg).
# assets/src/ is excluded intentionally — source files must not enter the font.

cd "$REPO_ROOT"
bunx fantasticon assets \
  --output assets \
  --name leyline \
  --font-types woff \
  --asset-types json \
  --font-height 1024 \
  --normalize

echo "✓  assets/leyline.woff + assets/leyline.json"

# ── Summary ───────────────────────────────────────────────────────────────────

echo ""
echo "Done. File map:"
echo "  assets/icon.svg             ← edit to change the icon design"
echo "  assets/glyph.svg            ← edit to change the status bar glyph"
echo "  icon.png                    → marketplace icon (256x256)"
echo "  assets/walkthrough-icon.png → walkthrough thumbnail (64x64)"
echo "  assets/leyline.woff         → status bar icon font"
echo "  assets/leyline.json         → glyph codepoint map"
