#!/usr/bin/env bash
# Builds the GitHub Pages static preview of Acttolog from the same source tree.
# Server-only surfaces (API routes, proxy middleware, force-dynamic admin
# pages that read the DB per request) are stripped in an ephemeral workspace;
# clients detect NEXT_PUBLIC_STATIC and use bundled equivalents. Production
# SSR/Vercel build is unaffected.
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT="$(pwd)"

SB=/tmp/atl-static-build
rm -rf "$SB"
mkdir -p "$SB"
tar cf - --exclude=node_modules --exclude=.next --exclude=.git --exclude=.static-build --exclude=.pages-site \
    --exclude=qa-shots --exclude=out . | (cd "$SB" && tar xf -)
rm -rf "$SB/src/app/api" "$SB/src/proxy.ts"
# force-dynamic admin pages render per-request from the DB; they cannot be
# statically exported and have no static-host equivalent (the SSR Pages
# harvest excludes them too).
rm -rf "$SB/src/app/admin/audit" "$SB/src/app/admin/metrics"
ln -sfn "$(pwd)/node_modules" "$SB/node_modules"

cd "$SB"
ACTTOLOG_EXPORT=1 NEXT_PUBLIC_STATIC=1 ACTTOLOG_LOWMEM=1 \
  NEXT_PUBLIC_SITE_URL=https://acttolog.github.io \
  NODE_OPTIONS="--max-old-space-size=470 --max-semi-space-size=1" \
  npx next build --webpack
echo "STATIC BUILD OK → $SB/out"
node "$ROOT/tools/flatten-rsc-payloads.js" "$SB/out"
# copy artifacts back to the project root so consumers keep the .static-build contract
rm -rf "$ROOT/.static-build" && mkdir -p "$ROOT/.static-build"
cp -a "$SB/out" "$ROOT/.static-build/out"
ls "$ROOT/.static-build/out" | head -20
