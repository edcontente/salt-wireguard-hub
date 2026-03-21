#!/usr/bin/env bash
set -euo pipefail

PKGDIR="$(ls -d "$HOME/.local/share/pnpm/global/5/.pnpm/tplink-omada-mcp@"* 2>/dev/null | head -n1)"
if [[ -z "${PKGDIR:-}" ]]; then
  echo "tplink-omada-mcp not found in pnpm global store."
  echo "Install with: pnpm add -g github:realtydev/omada-mcp"
  exit 1
fi

ENTRYPOINT="$PKGDIR/node_modules/tplink-omada-mcp/dist/index.js"
if [[ ! -f "$ENTRYPOINT" ]]; then
  echo "Entrypoint not found: $ENTRYPOINT"
  echo "Build package with: cd \"$PKGDIR/node_modules/tplink-omada-mcp\" && pnpm install && pnpm run build"
  exit 2
fi

: "${OMADA_URL:?OMADA_URL is required}"
: "${OMADA_USERNAME:?OMADA_USERNAME is required}"
: "${OMADA_PASSWORD:?OMADA_PASSWORD is required}"
: "${OMADA_SITE:?OMADA_SITE is required}"

exec node "$ENTRYPOINT"
