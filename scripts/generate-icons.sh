#!/usr/bin/env bash
# generate-icons.sh — Regenerate all Leyline icon assets from source SVGs.
#
# Source of truth: design/ley-triangle.svg (canonical geometry, transparent bg)
#
# Generated outputs:
#   icon.png                — 256x256 marketplace icon (PNG, dark background)
#   assets/icon.svg         — composed SVG for icon.png (background + triangle)
#   assets/ley.svg          — 16x16 monochrome font glyph (for WOFF)
#   assets/leyline.woff     — font used by the VS Code status bar icon
#   assets/leyline.json     — glyph codepoint map
#
# Source files (NOT processed by fantasticon — kept in design/):
#   design/ley-triangle.svg         — canonical triangle, white, transparent bg
#   design/ley-triangle-theme.svg   — theme-aware version (CSS vars) for walkthroughs
#
# Requirements:
#   - rsvg-convert  (brew install librsvg)
#   - bun           (https://bun.sh)
#
# Usage:
#   bash scripts/generate-icons.sh
#   bun run generate-all-icons

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ASSETS="$REPO_ROOT/assets"
DESIGN="$REPO_ROOT/design"

# ── Check dependencies ────────────────────────────────────────────────────────

check_cmd() {
  if ! command -v "$1" &>/dev/null; then
    echo "❌  Missing dependency: $1 ($2)"
    exit 1
  fi
}

check_cmd rsvg-convert "brew install librsvg"
check_cmd bun          "https://bun.sh"

echo "✓  Dependencies OK"

# ── 1. Marketplace icon (icon.png) ───────────────────────────────────────────
# Compose: dark background + white triangle → icon.svg → icon.png (256x256)

cat > "$ASSETS/icon.svg" << 'SVGEOF'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
  <rect width="256" height="256" rx="52" fill="#0d0d1f"/>
  <line x1="128" y1="40" x2="48" y2="208" stroke="#ffffff" stroke-width="8" stroke-linecap="round"/>
  <line x1="128" y1="40" x2="208" y2="208" stroke="#ffffff" stroke-width="8" stroke-linecap="round"/>
  <line x1="48" y1="208" x2="208" y2="208" stroke="#ffffff" stroke-width="8" stroke-linecap="round"/>
  <circle cx="128" cy="150" r="16" fill="#ffffff"/>
  <circle cx="48" cy="208" r="20" fill="#ffffff"/>
  <circle cx="208" cy="208" r="20" fill="#ffffff"/>
</svg>
SVGEOF

rsvg-convert -w 256 -h 256 "$ASSETS/icon.svg" -o "$REPO_ROOT/icon.png"
echo "✓  icon.png (256x256)"

# ── 2. Font glyph (assets/ley.svg) ───────────────────────────────────────────
# 16x16 monochrome outline triangle with nexus dot.
# Winding direction (nonzero rule) — NOT fill-rule=evenodd (breaks WOFF).
# Outer path CW, inner path CCW → hollow outline.
# Nexus arc sweep=1 (CW) → refills the dot inside the hollow area.

cat > "$ASSETS/ley.svg" << 'SVGEOF'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
  <path fill="#000"
    d="M8 1 L15 15 L1 15 Z
       M8 3.5 L3 14 L13 14 Z
       M8 10.3 m-1.4 0 a1.4 1.4 0 1 1 2.8 0 a1.4 1.4 0 1 1 -2.8 0 Z"/>
</svg>
SVGEOF

echo "✓  assets/ley.svg (16x16 glyph)"

# ── 3. WOFF font (assets/leyline.woff) ───────────────────────────────────────
# fantasticon processes only top-level SVGs in assets/ (ley.svg + icon.svg).
# design/ is intentionally kept outside to avoid polluting the font.

cd "$REPO_ROOT"
bunx fantasticon assets \
  --output assets \
  --name leyline \
  --font-types woff \
  --asset-types json \
  --font-height 1024 \
  --normalize

echo "✓  assets/leyline.woff + assets/leyline.json"

# ── Done ─────────────────────────────────────────────────────────────────────

echo ""
echo "All icon assets regenerated."
echo ""
echo "  design/ley-triangle.svg         → edit this to change the icon design"
echo "  design/ley-triangle-theme.svg   → theme-aware SVG for walkthrough icon"
echo "  assets/icon.svg                 → composed marketplace SVG (with background)"
echo "  icon.png                        → marketplace + walkthrough thumbnail (256x256)"
echo "  assets/ley.svg                  → font glyph source (16x16)"
echo "  assets/leyline.woff             → status bar icon font"
