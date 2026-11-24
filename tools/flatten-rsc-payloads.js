#!/usr/bin/env node
'use strict';

/**
 * Flatten Next's exported RSC segment payloads into the filenames the client
 * actually requests.
 *
 * `output: export` writes a page's payload as nested directories —
 *   games/khoja-nepal/__next.games/$d$slug/__PAGE__.txt
 * while the App Router prefetches the dotted form —
 *   games/khoja-nepal/__next.games.$d$slug.__PAGE__.txt
 * so every client-side prefetch 404s and navigation falls back to a full
 * document load. This copies each payload to its dotted name beside the
 * directories, leaving the originals in place.
 *
 * Usage: node tools/flatten-rsc-payloads.js <out-dir>
 */

const fs = require('node:fs');
const path = require('node:path');

const walk = (dir, hits) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, hits);
    else if (e.name === '__PAGE__.txt') hits.push(p);
  }
  return hits;
};

function flattenRscPayloads(outDir) {
  const root = path.resolve(outDir);
  let written = 0;
  let skipped = 0;
  let bytes = 0;
  for (const file of walk(root, [])) {
    const rel = path.relative(root, file).split(path.sep);
    const idx = rel.findIndex((s) => s.startsWith('__next.'));
    if (idx < 0) continue;
    const flat = rel.slice(idx, -1).join('.') + '.__PAGE__.txt';
    const target = path.join(root, ...rel.slice(0, idx), flat);
    if (fs.existsSync(target) && fs.statSync(target).size === fs.statSync(file).size) {
      skipped++;
      continue;
    }
    fs.copyFileSync(file, target);
    written++;
    bytes += fs.statSync(target).size;
  }
  return { written, skipped, bytes };
}

module.exports = { flattenRscPayloads };

if (require.main === module) {
  const out = process.argv[2];
  if (!out || !fs.existsSync(out)) {
    console.error('usage: node tools/flatten-rsc-payloads.js <out-dir>');
    process.exit(1);
  }
  const r = flattenRscPayloads(out);
  console.log(`RSC payloads flattened: ${r.written} written, ${r.skipped} already current, ${(r.bytes / 1048576).toFixed(1)}MB`);
}