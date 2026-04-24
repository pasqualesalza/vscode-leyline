#!/usr/bin/env bash
# generate-icons.sh — Regenerate all Leyline icon assets from source SVGs.
#
# Folder convention:
#   assets/src/   ← source design files (excluded from VSIX via .vscodeignore)
#   assets/       ← generated files (included in VSIX)
#
# Source files:
#   assets/src/icon-source.svg  — canonical triangle geometry, transparent bg
#
# Generated outputs:
#   assets/icon.svg             — composed SVG (background + triangle)
#   icon.png                    — 256x256 marketplace icon (PNG, dark background)
#   assets/glyph.svg            — 16x16 monochrome font glyph
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

# ── 1. assets/icon.svg + icon.png (marketplace icon) ─────────────────────────
# Compose dark background + white triangle + ghost point, export as 256x256 PNG.

cat > "$ASSETS/icon.svg" << 'EOF'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
  <rect width="256" height="256" rx="52" fill="#0d0d1f"/>
  <line x1="128" y1="44" x2="52" y2="200" stroke="#ffffff" stroke-width="8" stroke-linecap="round"/>
  <line x1="128" y1="44" x2="204" y2="200" stroke="#ffffff" stroke-width="8" stroke-linecap="round"/>
  <line x1="52" y1="200" x2="204" y2="200" stroke="#ffffff" stroke-width="8" stroke-linecap="round"/>
  <circle cx="128" cy="148" r="14" fill="#ffffff"/>
  <circle cx="52" cy="200" r="18" fill="#ffffff"/>
  <circle cx="204" cy="200" r="18" fill="#ffffff"/>
  <circle cx="128" cy="44" r="18" fill="none" stroke="#ffffff" stroke-width="8" opacity="0.5"/>
</svg>
EOF

rsvg-convert -w 256 -h 256 "$ASSETS/icon.svg" -o "$REPO_ROOT/icon.png"
echo "✓  icon.png (256x256 PNG)"

# ── 2. assets/glyph.svg (status bar font glyph) ──────────────────────────────
# 16x16 monochrome outline triangle + nexus dot.
# Winding direction (nonzero rule) — do NOT use fill-rule=evenodd (breaks WOFF).
# Outer path CW + inner path CCW = hollow triangle outline.
# Nexus circle with sweep-flag=1 (CW) = dot refills inside the hollow.

cat > "$ASSETS/glyph.svg" << 'EOF'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
  <path fill="#000"
    d="M8 1 L15 15 L1 15 Z
       M8 3.5 L3 14 L13 14 Z
       M8 10.3 m-1.4 0 a1.4 1.4 0 1 1 2.8 0 a1.4 1.4 0 1 1 -2.8 0 Z"/>
</svg>
EOF

echo "✓  assets/glyph.svg (16x16 monochrome)"

# ── 3. assets/leyline.woff + assets/leyline.json ─────────────────────────────
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
echo "  assets/src/icon-source.svg  ← edit to change the icon geometry (excluded from VSIX)"
echo "  assets/icon.svg             → composed SVG (background + triangle)"
echo "  icon.png                    → marketplace icon (256x256)"
echo "  assets/glyph.svg            → font glyph source (16x16)"
echo "  assets/leyline.woff         → status bar icon font"
echo "  assets/leyline.json         → glyph codepoint map"
