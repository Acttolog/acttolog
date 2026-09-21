/**
 * ACTTOLOG — prototype content extractor (build-time tool)
 * Mechanically extracts the seed database + i18n dictionaries from the audited
 * prototype (acttolog-prototype/app.js) into typed production JSON.
 *
 * Production honesty rules applied here (master spec §104):
 *  - synthetic sample analytics events are DISCARDED (db starts empty)
 *  - fabricated darkroom `usage` counters are reset to 0
 *  - owner email is NOT exported (server-side env only, §5/§45)
 *  - reviewDate = extraction date (honest "last reviewed")
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROTO = path.join(__dirname, 'prototype-app.js');
const OUT_DIR = path.join(__dirname, '..', 'src', 'lib', 'content');
const MSG_DIR = path.join(__dirname, '..', 'messages');

const src = fs.readFileSync(PROTO, 'utf8').split('\n');
const slice = (a, b) => src.slice(a - 1, b).join('\n');

const I18N_SRC = slice(58, 82);          // const I18N={en:{...},ne:{...}};
const SEED_SRC = slice(151, 373);        // seed + seedDR + seedPosts + seedEvents
const SECS_SRC = slice(378, 388);        // defaultSecs

const harness = `
/* deterministic PRNG so ids/dates are stable across runs */
let _s = 20260922;
Math.random = () => { _s = (_s * 1664525 + 1013904223) >>> 0; return _s / 4294967296; };

const B = (en, ne) => ({ en, ne: ne || '' });
const uid = p => (p || 'id') + '_' + Math.random().toString(36).slice(2, 9);
const KTM = 'Asia/Kathmandu';
const nowISO = () => new Date().toISOString();
const iso = d => d.toISOString().slice(0, 10);
const pd = n => { const d = new Date(); d.setDate(d.getDate() + n); return iso(d); };
const md = n => { const d = new Date(); d.setDate(d.getDate() - n); return iso(d); };
const hs = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const store = { get: (k, f) => f, set: () => true, del: () => {} };
const toast = () => {};
const OWNER = 'owner@private.invalid'; /* never exported — server env only */

${SEED_SRC}
${SECS_SRC}

const db = seed();
db.homeSections = defaultSecs();
export const seedData = db;
${I18N_SRC.replace('const I18N=', 'export const I18N=')}
`;

const harnessPath = path.join(__dirname, '_harness.mjs');
fs.writeFileSync(harnessPath, harness);

const mod = await import(harnessPath);
const db = JSON.parse(JSON.stringify(mod.seedData));
const I18N = mod.I18N;

/* ---- production honesty pass ---- */
const TODAY = new Date().toISOString().slice(0, 10);
delete db.events;            // no synthetic analytics in production
db.sample = false;
db.consent = null;
db.session = null;
db.users = [];               // users are created by real Google OAuth; owner is provisioned by env at first login
if (Array.isArray(db.dr)) for (const r of db.dr) { r.usage = 0; r.reviewDate = TODAY; r.adminNotes = ''; }
if (Array.isArray(db.drSubs)) db.drSubs = [];
if (Array.isArray(db.messages)) db.messages = [];
if (Array.isArray(db.subs)) db.subs = [];
if (Array.isArray(db.orders)) db.orders = [];
if (Array.isArray(db.notifs)) db.notifs = [];
if (Array.isArray(db.convs)) db.convs = [];
if (db.ga) { db.ga.id = ''; db.ga.enabled = false; }
if (db.ai) db.ai.keys = false;

/* integrity guard: only the public contact email may appear anywhere (§5, §45) */
const raw = JSON.stringify(db);
const emails = new Set((raw.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) || []));
const allowed = new Set(['thesynresearch@gmail.com', 'you@email.com', 'owner@private.invalid']);
const leaks = [...emails].filter((e) => !allowed.has(e.toLowerCase()));
if (leaks.length) {
  console.error('FATAL: non-public email detected in extracted content:', leaks.join(', '));
  process.exit(1);
}

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.mkdirSync(MSG_DIR, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, 'seed.json'), JSON.stringify(db, null, 1));
fs.writeFileSync(path.join(MSG_DIR, 'en.json'), JSON.stringify(I18N.en, null, 2));
fs.writeFileSync(path.join(MSG_DIR, 'ne.json'), JSON.stringify(I18N.ne, null, 2));

/* report */
const count = (x) => Array.isArray(x) ? x.length : (x && typeof x === 'object' ? Object.keys(x).length : '-');
console.log('seed.json written:', (fs.statSync(path.join(OUT_DIR, 'seed.json')).size / 1024).toFixed(1) + ' KB');
console.log('entities:', Object.keys(db).map(k => k + '=' + count(db[k])).join(' '));
console.log('i18n keys: en=' + count(I18N.en) + ' ne=' + count(I18N.ne));
fs.unlinkSync(harnessPath);
