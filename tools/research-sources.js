#!/usr/bin/env node
'use strict';

/**
 * ACTTOLOG build-time source verification pipeline.
 *
 * Honesty contract: this script performs REAL HTTPS GET requests against the
 * official Nepali portals seeded from src/lib/content/notices.json (kind:
 * 'source') plus a small set of well-known official portals. It records only
 * what it measured — HTTP status, response time, final URL, page <title> and
 * the checked-at timestamp — into src/lib/content/sources.json. It never
 * invents a working URL, never marks a failed fetch as reachable, and never
 * advances `lastVerifiedOn` unless the fetch actually succeeded.
 *
 * This is a reachability check compiled at build time, NOT a live government
 * vacancy feed. The ledger's bilingual `note` says so plainly.
 *
 * Usage:
 *   node tools/research-sources.js               # check all, write ledger
 *   node tools/research-sources.js --dry-run     # check all, print, write nothing
 *   node tools/research-sources.js --only psc,moha
 *
 * Exit codes: 0 when the run completed (unreachable hosts are a measured
 * result, not a failure); 1 on a real script/usage error.
 */

const fs = require('node:fs');
const path = require('node:path');
const https = require('node:https');
const tls = require('node:tls');
const { X509Certificate } = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const NOTICES_PATH = path.join(ROOT, 'src', 'lib', 'content', 'notices.json');
const LEDGER_PATH = path.join(ROOT, 'src', 'lib', 'content', 'sources.json');

const TIMEOUT_MS = 15_000;
const DELAY_MS = 600; // be polite: sequential with a small gap between hosts
const RETRY_GAP_MS = 1_500;
const UA =
  'ACTTOLOG-SourceCheck/1.0 (+https://acttolog.blogspot.com; build-time reachability verification of official portals; contact via site)';

/* ── helpers ─────────────────────────────────────────────────────── */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Today's calendar date in Nepal time (UTC+5:45), from the machine clock. */
const nepalDate = (d = new Date()) =>
  new Date(d.getTime() + (5 * 60 + 45) * 60_000).toISOString().slice(0, 10);

const stripWww = (host) => host.replace(/^www\./i, '').toLowerCase();

/** Stable id from hostname: psc.gov.np -> psc, jobs.nrb.org.np -> jobs-nrb. */
function idFromUrl(url) {
  const u = new URL(url);
  let host = stripWww(u.hostname);
  for (const suffix of ['.gov.np', '.org.np', '.com.np', '.net.np', '.edu.np', '.mil.np', '.com', '.net', '.org', '.np']) {
    if (host.endsWith(suffix)) {
      host = host.slice(0, -suffix.length);
      break;
    }
  }
  return host.replace(/\./g, '-') || u.hostname;
}

/** Dedupe key: hostname + path (trailing slash ignored). */
function dedupeKey(url) {
  const u = new URL(url);
  const p = u.pathname.replace(/\/+$/, '') || '/';
  return `${u.hostname.toLowerCase()}${p}`;
}

/** Compare requested vs final URL ignoring a bare trailing slash. */
function sameTarget(a, b) {
  try {
    const ua = new URL(a);
    const ub = new URL(b);
    return (
      ua.hostname.toLowerCase() === ub.hostname.toLowerCase() &&
      (ua.pathname.replace(/\/+$/, '') || '/') === (ub.pathname.replace(/\/+$/, '') || '/') &&
      ua.search === ub.search
    );
  } catch {
    return a === b;
  }
}

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'" };
function decodeEntities(s) {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&([a-z#0-9]+);/gi, (m, name) => ENTITIES[name.toLowerCase()] ?? m);
}

function describeError(err) {
  if (err && (err.name === 'AbortError' || err.name === 'TimeoutError')) return `timeout after ${TIMEOUT_MS / 1000}s`;
  const cause = err && err.cause;
  const code = cause && (cause.code || cause.errno);
  const msg = (cause && cause.message) || (err && err.message) || String(err);
  return code ? `${code}: ${msg}` : msg;
}

/* ── seed list ───────────────────────────────────────────────────── */

/** Well-known official portals to add when their host is not already seeded. */
const EXTRA_SEEDS = [
  { url: 'https://psc.gov.np', name: { en: 'Public Service Commission', ne: 'लोक सेवा आयोग' }, scope: 'loksewa', category: 'government' },
  { url: 'https://psconline1.psc.gov.np', name: { en: 'PSC Online — Loksewa application portal', ne: 'लोक सेवा अनलाइन — आवेदन पोर्टल' }, scope: 'loksewa', category: 'government' },
  { url: 'https://moha.gov.np', name: { en: 'Ministry of Home Affairs', ne: 'गृह मन्त्रालय' }, scope: 'loksewa', category: 'government' },
  { url: 'https://mof.gov.np', name: { en: 'Ministry of Finance', ne: 'अर्थ मन्त्रालय' }, scope: 'loksewa', category: 'government' },
  { url: 'https://mofaga.gov.np', name: { en: 'Ministry of Federal Affairs & General Administration', ne: 'सङ्घीय मामिला तथा सामान्य प्रशासन मन्त्रालय' }, scope: 'loksewa', category: 'government' },
  { url: 'https://gorkhapatra.org.np', name: { en: 'Gorkhapatra — the official gazette', ne: 'गोरखापत्र — आधिकारिक राजपत्र' }, scope: 'loksewa', category: 'government' },
  { url: 'https://nea.org.np', name: { en: 'Nepal Electricity Authority', ne: 'नेपाल विद्युत् प्राधिकरण' }, scope: 'loksewa', category: 'sansthan' },
  { url: 'https://ntc.net.np', name: { en: 'Nepal Telecom', ne: 'नेपाल टेलिकम' }, scope: 'loksewa', category: 'sansthan' },
  { url: 'https://nepalpassport.gov.np', name: { en: 'Department of Passports', ne: 'राहदानी विभाग' }, scope: 'nepal', category: 'government' },
  { url: 'https://tu.edu.np', name: { en: 'Tribhuvan University', ne: 'त्रिभुवन विश्वविद्यालय' }, scope: 'academy', category: 'government' },
  { url: 'https://ku.edu.np', name: { en: 'Kathmandu University', ne: 'काठमाडौं विश्वविद्यालय' }, scope: 'academy', category: 'government' },
  { url: 'https://nrb.org.np', name: { en: 'Nepal Rastra Bank', ne: 'नेपाल राष्ट्र बैंक' }, scope: 'loksewa', category: 'bank' },
];

function buildSeeds() {
  const notices = JSON.parse(fs.readFileSync(NOTICES_PATH, 'utf8'));
  const seeds = [];
  const byKey = new Map();
  const byHost = new Set();

  const push = (seed) => {
    const key = dedupeKey(seed.url);
    if (byKey.has(key)) return;
    byKey.set(key, seed);
    byHost.add(stripWww(new URL(seed.url).hostname));
    seeds.push(seed);
  };

  for (const n of notices.notices || []) {
    if (n.kind !== 'source' || !/^https:\/\//i.test(n.sourceUrl || '')) continue;
    push({
      id: idFromUrl(n.sourceUrl),
      url: n.sourceUrl,
      name: n.title,
      scope: n.scope,
      category: n.category,
    });
  }
  for (const extra of EXTRA_SEEDS) {
    const host = stripWww(new URL(extra.url).hostname);
    if (byHost.has(host)) continue; // already present from the curated ledger
    push({ id: idFromUrl(extra.url), ...extra });
  }

  // Guarantee unique ids (append a path slug on collision).
  const seenIds = new Map();
  for (const s of seeds) {
    if (seenIds.has(s.id)) {
      const slug = (new URL(s.url).pathname.replace(/\/+$/, '').split('/').filter(Boolean)[0] || 'alt').toLowerCase();
      let candidate = `${s.id}-${slug}`;
      let i = 2;
      while (seenIds.has(candidate)) candidate = `${s.id}-${slug}-${i++}`;
      s.id = candidate;
    }
    seenIds.set(s.id, s);
  }
  return seeds;
}

/* ── measurement ─────────────────────────────────────────────────── */

const MAX_HOPS = 6;
const BODY_CAP = 256 * 1024;

/** Node ships no AIA chasing: a server that sends only its leaf fails chain
 *  building even though every browser completes it. These two codes mean the
 *  issuer is missing, not that the certificate is untrusted. */
const CHAIN_CODES = new Set(['UNABLE_TO_VERIFY_LEAF_SIGNATURE', 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY']);

const BOT_BODY = /request rejected|just a moment|attention required|access denied|checking your browser|cf-browser-verification|cf-chl-|tspd|incident id|please enable javascript|are you a robot/i;

function requestOnce(url, ca, deadline) {
  return new Promise((resolve, reject) => {
    const left = deadline - Date.now();
    if (left <= 0) return reject(Object.assign(new Error(`timeout after ${TIMEOUT_MS / 1000}s`), { code: 'ETIMEDOUT' }));
    const req = https.get(
      url,
      {
        agent: false,
        ca,
        timeout: left,
        headers: {
          'User-Agent': UA,
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en,ne;q=0.8',
          'Accept-Encoding': 'identity',
        },
      },
      (res) => {
        const chunks = [];
        let size = 0;
        res.on('data', (c) => {
          size += c.length;
          if (size <= BODY_CAP) chunks.push(c);
        });
        res.on('end', () =>
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: Buffer.concat(chunks).toString('utf8'),
            bytes: size,
          }),
        );
        res.on('error', reject);
      },
    );
    req.on('timeout', () => req.destroy(Object.assign(new Error(`timeout after ${TIMEOUT_MS / 1000}s`), { code: 'ETIMEDOUT' })));
    req.on('error', reject);
    return undefined;
  });
}

/** Follow redirects by hand so the final URL and every hop are measured. */
async function walk(url, ca, deadline) {
  let current = url;
  const hops = [];
  for (let i = 0; i <= MAX_HOPS; i++) {
    const res = await requestOnce(current, ca, deadline);
    const loc = res.headers.location;
    if (res.status >= 300 && res.status < 400 && loc) {
      const next = new URL(loc, current).toString();
      if (hops.some((h) => h.to === next)) throw Object.assign(new Error('redirect loop'), { code: 'ERR_REDIRECT_LOOP' });
      hops.push({ from: current, status: res.status, to: next });
      current = next;
      continue;
    }
    return { ...res, finalUrl: current, hops };
  }
  throw Object.assign(new Error(`more than ${MAX_HOPS} redirects`), { code: 'ERR_TOO_MANY_REDIRECTS' });
}

/** Read the leaf's AIA CA-Issuers URL and fetch that intermediate. The retry
 *  still verifies against Node's bundled Mozilla roots — nothing is disabled. */
async function completeChain(url) {
  const u = new URL(url);
  const peer = await new Promise((resolve, reject) => {
    const sock = tls.connect(
      { host: u.hostname, port: Number(u.port) || 443, servername: u.hostname, rejectUnauthorized: false, timeout: 8000 },
      () => {
        const cert = sock.getPeerCertificate();
        sock.end();
        resolve(cert);
      },
    );
    sock.on('timeout', () => sock.destroy(new Error('tls probe timeout')));
    sock.on('error', reject);
  });
  const access = peer && peer.infoAccess;
  const uris = access ? Object.entries(access).filter(([k]) => /ca issuers/i.test(k)).flatMap(([, v]) => (Array.isArray(v) ? v : [v])) : [];
  if (!uris.length) return null;
  for (const uri of uris) {
    if (!/^https?:\/\//i.test(uri)) continue;
    try {
      const res = await fetch(uri, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      // AIA serves DER certificates; X509Certificate also accepts PEM. PKCS7
      // bundles are not parseable here, so they honestly fall through.
      const pem = new X509Certificate(buf).toString();
      if (/BEGIN CERTIFICATE/.test(pem)) return pem;
    } catch {
      /* try the next AIA URI */
    }
  }
  return null;
}

function classify(res, requestedUrl) {
  const contentType = (res.headers['content-type'] || '').split(';')[0].trim() || null;
  const m = res.body.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = m ? decodeEntities(m[1]).replace(/\s+/g, ' ').trim().slice(0, 160) || null : null;
  // A 200 carrying a WAF interstitial is not a reachable portal. The measured
  // signature is a tiny body with a challenge string, or no title at all.
  const interstitial =
    (res.bytes < 4096 && BOT_BODY.test(res.body)) ||
    (res.bytes < 2048 && !title && /html/i.test(contentType || '')) ||
    res.status === 403;
  return { contentType, title, interstitial };
}

async function attempt(url) {
  const started = Date.now();
  const deadline = started + TIMEOUT_MS;
  const finish = (extra) => ({ ms: Date.now() - started, checkedAt: new Date().toISOString(), ...extra });
  try {
    let res;
    let chain = null;
    try {
      res = await walk(url, undefined, deadline);
    } catch (err) {
      if (!CHAIN_CODES.has(err && err.code)) throw err;
      const pem = await completeChain(url);
      if (!pem) throw err;
      res = await walk(url, [...tls.rootCertificates, pem], deadline);
      chain = 'completed-via-aia';
    }
    const { contentType, title, interstitial } = classify(res, url);
    const ok = res.status >= 200 && res.status < 300 && !interstitial;
    return finish({
      ok,
      httpStatus: res.status,
      finalUrl: res.finalUrl,
      contentType,
      title,
      bytes: res.bytes,
      hops: res.hops.length,
      chain,
      blocked: interstitial,
      error: ok
        ? null
        : interstitial
          ? `bot/WAF interstitial (HTTP ${res.status}, ${res.bytes} B)`
          : `HTTP ${res.status}`,
    });
  } catch (err) {
    return finish({
      ok: false,
      httpStatus: null,
      finalUrl: url,
      contentType: null,
      title: null,
      bytes: null,
      hops: 0,
      chain: null,
      blocked: false,
      error: describeError(err),
      errorKind: (err && err.code) || 'UNKNOWN',
    });
  }
}

async function measure(url) {
  let r = await attempt(url);
  if (!r.ok && r.httpStatus == null) {
    // one retry on network-level failure only (never on an HTTP error status)
    await sleep(RETRY_GAP_MS);
    r = await attempt(url);
  }
  return r;
}

/* ── ledger assembly ─────────────────────────────────────────────── */

const NOTE = {
  en: 'Automated reachability check of official portals, run at build time by tools/research-sources.js — not a live government vacancy feed. A reachable row only means the portal answered our HTTPS request at the recorded moment; it says nothing about current vacancies. "Bot check" means the server returned a WAF or JavaScript challenge instead of the page, so we could not verify it. Where a server sends an incomplete certificate chain we complete it from the certificate\'s own AIA record and still verify against the standard root store. Always open the official site and verify the current notice, dates and eligibility before applying.',
  ne: 'tools/research-sources.js ले बिल्ड समयमा चलाएको आधिकारिक पोर्टलहरूको स्वचालित पहुँच जाँच — प्रत्यक्ष सरकारी पदपूर्ति फिड होइन। पहुँचयोग्य पङ्क्तिले रेकर्ड गरिएको क्षणमा पोर्टलले हाम्रो HTTPS अनुरोधको जवाफ दियो भन्ने मात्र बुझाउँछ; हालको पदपूर्तिबारे केही भन्दैन। "बोट जाँच" भन्नाले सर्भरले पृष्ठको सट्टा WAF वा जाभास्क्रिप्ट चुनौती फर्कायो, त्यसैले हामीले जाँच्न सकेनौँ। सर्भरले अपुरो प्रमाणपत्र साङ्लो पठाएमा हामी त्यसकै AIA रेकर्डबाट पूरा गर्छौँ र मानक रुट स्टोरविरुद्ध जाँच्छौँ। आवेदन दिनुअघि आधिकारिक साइट खोलेर हालको सूचना, मिति र योग्यता अनिवार्य जाँच्नुहोस्।',
};

function loadLedger() {
  try {
    const parsed = JSON.parse(fs.readFileSync(LEDGER_PATH, 'utf8'));
    if (parsed && Array.isArray(parsed.sources)) return parsed;
  } catch {
    /* first run or unreadable ledger — start fresh */
  }
  return null;
}

function statusOf(m, requestedUrl) {
  if (m.blocked) return 'blocked';
  if (!m.ok) return 'unreachable';
  return sameTarget(requestedUrl, m.finalUrl) ? 'reachable' : 'redirected';
}

/** Merge one measured result into a ledger row, preserving curated fields. */
function mergeRow(prev, seed, m, today) {
  // The curated directory owns the URL: a corrected portal address must win
  // over the address stored in the previous ledger run.
  const url = (seed && seed.url) || (prev && prev.url);
  const base = prev || {
    id: seed.id,
    name: seed.name,
    scope: seed.scope,
    category: seed.category,
    url,
    lastVerifiedOn: null,
  };
  const row = {
    ...base,
    url,
    host: new URL(url).hostname,
    status: statusOf(m, url),
    httpStatus: m.httpStatus,
    ms: m.ms,
    checkedAt: m.checkedAt,
    finalUrl: m.finalUrl,
    contentType: m.contentType,
    title: m.title,
    bytes: m.bytes ?? null,
    redirects: m.hops ?? 0,
    // only advance the verification date when the fetch actually succeeded
    lastVerifiedOn: m.ok ? today : base.lastVerifiedOn || null,
  };
  if (m.chain) row.tlsChain = m.chain;
  else delete row.tlsChain;
  if (m.errorKind) row.errorKind = m.errorKind;
  else delete row.errorKind;
  if (m.error) row.error = m.error;
  else delete row.error;
  return row;
}

/* ── reporting ───────────────────────────────────────────────────── */

function pad(s, n) {
  s = String(s ?? '—');
  return s.length > n ? s.slice(0, n - 1) + '…' : s.padEnd(n);
}

function printTable(rows) {
  const head = `${pad('ID', 18)}${pad('HOST', 28)}${pad('STATUS', 13)}${pad('HTTP', 6)}${pad('MS', 8)}${pad('VERIFIED', 12)}TITLE / ERROR`;
  console.log(head);
  console.log('-'.repeat(Math.min(head.length + 30, 140)));
  for (const r of rows) {
    const detail = r.error ? `! ${r.error}` : r.title || '';
    console.log(
      `${pad(r.id, 18)}${pad(r.host, 28)}${pad(r.status, 13)}${pad(r.httpStatus, 6)}${pad(r.ms, 8)}${pad(r.lastVerifiedOn, 12)}${detail.slice(0, 70)}`
    );
  }
}

/* ── main ────────────────────────────────────────────────────────── */

async function main() {
  const argv = process.argv.slice(2);
  const dryRun = argv.includes('--dry-run');
  const onlyIdx = argv.indexOf('--only');
  let only = null;
  if (onlyIdx !== -1) {
    const raw = argv[onlyIdx + 1];
    if (!raw || raw.startsWith('--')) {
      console.error('Usage error: --only requires a comma-separated list of source ids.');
      process.exit(1);
    }
    only = new Set(raw.split(',').map((s) => s.trim()).filter(Boolean));
  }
  for (const a of argv) {
    if (a === '--dry-run' || a === '--only' || (onlyIdx !== -1 && a === argv[onlyIdx + 1])) continue;
    console.error(`Usage error: unknown flag "${a}". Supported: --dry-run, --only <id,id>`);
    process.exit(1);
  }

  const seeds = buildSeeds();
  const prevLedger = loadLedger();
  const prevById = new Map((prevLedger?.sources || []).map((s) => [s.id, s]));

  // Work list: every seed plus any human-added ledger rows not in the seeds.
  const work = seeds.map((seed) => ({ seed, prev: prevById.get(seed.id) || null }));
  const seedIds = new Set(seeds.map((s) => s.id));
  for (const [id, prev] of prevById) {
    if (!seedIds.has(id)) work.push({ seed: null, prev });
  }

  if (only) {
    const known = new Set(work.map((w) => w.prev?.id || w.seed.id));
    const unknown = [...only].filter((id) => !known.has(id));
    if (unknown.length) {
      console.error(`Usage error: unknown source id(s): ${unknown.join(', ')}`);
      console.error(`Known ids: ${[...known].join(', ')}`);
      process.exit(1);
    }
  }

  const today = nepalDate();
  const targets = work.filter((w) => !only || only.has(w.prev?.id || w.seed.id));
  console.log(
    `ACTTOLOG source verification — ${targets.length} of ${work.length} portals, ${dryRun ? 'DRY RUN (nothing written)' : 'writing ' + path.relative(ROOT, LEDGER_PATH)}`
  );
  console.log(`Nepal date: ${today} · timeout ${TIMEOUT_MS / 1000}s · one retry on network error · sequential, ${DELAY_MS}ms gap\n`);

  const measured = new Map();
  for (let i = 0; i < targets.length; i++) {
    const w = targets[i];
    const id = w.prev?.id || w.seed.id;
    const url = w.seed?.url || w.prev?.url;
    process.stdout.write(`[${i + 1}/${targets.length}] ${id} ${url} … `);
    const m = await measure(url);
    const row = mergeRow(w.prev, w.seed, m, today);
    measured.set(id, row);
    console.log(`${row.status}${m.httpStatus != null ? ' HTTP ' + m.httpStatus : ''} ${m.ms}ms${m.error ? ' — ' + m.error : ''}`);
    if (i < targets.length - 1) await sleep(DELAY_MS);
  }

  // Assemble the full ledger: checked rows refreshed, unchecked rows preserved.
  // With --only and no prior ledger, only the measured rows exist to write.
  const sources = work.map((w) => {
    const id = w.prev?.id || w.seed.id;
    return measured.get(id) || w.prev;
  }).filter(Boolean);

  const okCount = sources.filter((s) => s.status === 'reachable' || s.status === 'redirected').length;
  const blockedCount = sources.filter((s) => s.status === 'blocked').length;
  const meta = {
    compiledAt: new Date().toISOString(),
    generator: 'tools/research-sources.js',
    checked: targets.length,
    reachable: okCount,
    blocked: blockedCount,
    unreachable: sources.length - okCount - blockedCount,
    note: NOTE,
  };

  console.log('\n── measured summary ──');
  printTable(sources);
  console.log(
    `\nchecked this run: ${targets.length} · ledger rows: ${sources.length} · reachable: ${okCount} (redirected: ${sources.filter((s) => s.status === 'redirected').length}) · bot-blocked: ${blockedCount} · unreachable: ${sources.length - okCount - blockedCount}`
  );

  if (dryRun) {
    console.log('\nDry run complete — ledger not written.');
    return;
  }
  fs.mkdirSync(path.dirname(LEDGER_PATH), { recursive: true });
  fs.writeFileSync(LEDGER_PATH, JSON.stringify({ meta, sources }, null, 2) + '\n', 'utf8');
  console.log(`\nWrote ${path.relative(ROOT, LEDGER_PATH)} (compiledAt ${meta.compiledAt}).`);
}

main().catch((err) => {
  console.error('research-sources: script error —', err && err.stack ? err.stack : err);
  process.exit(1);
});