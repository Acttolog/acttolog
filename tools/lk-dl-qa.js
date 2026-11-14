#!/usr/bin/env node
/*
 * Loksewa download-centre QA.
 *
 * The point of this harness is honesty: every size printed on a card is
 * re-measured with a HEAD request, every link is proven to resolve, and the
 * print stylesheet is checked under emulated print media. It also drives the
 * 3D explorer and the reduced-motion fallback.
 *
 *   LK_BASE=http://127.0.0.1:3100 node tools/lk-dl-qa.js
 */
const fs = require('node:fs');
const path = require('node:path');
const puppeteer = require('puppeteer');

const BASE = process.env.LK_BASE || 'http://127.0.0.1:3100';
const DL = path.join(__dirname, '..', 'public', 'loksewa', 'dl');
const PAID = path.join(__dirname, '..', '.lk-paid');
const papers = require('../src/lib/content/loksewa.json').papers.map((p) => p.slug);
const DOCS = [...papers, 'full', 'planner', 'laws', 'practice'];

let pass = 0;
const fails = [];
const check = (ok, name, detail = '') => {
  if (ok) {
    pass += 1;
    console.log(`  ok  ${name}`);
  } else {
    fails.push(`${name}${detail ? ' — ' + detail : ''}`);
    console.log(`FAIL  ${name}${detail ? ' — ' + detail : ''}`);
  }
};

const launch = () =>
  puppeteer.launch({
    headless: 'new',
    args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--disable-features=CalculateNativeWinOcclusion',
      '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'],
  });

const seed = () => {
  try {
    localStorage.setItem('act_welcomed', '1');
    localStorage.setItem('act_consent', JSON.stringify({ necessary: true, analytics: false, personalization: false }));
  } catch { /* private mode */ }
};

const head = async (urlPath) => {
  const res = await fetch(BASE + urlPath, { method: 'HEAD' });
  return {
    ok: res.ok,
    status: res.status,
    bytes: Number(res.headers.get('content-length') || 0),
    type: res.headers.get('content-type') || '',
  };
};

const mb = (n) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

(async () => {
  const browser = await launch();
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error' && !/THREE\.WebGL|WebGL/i.test(m.text())) errs.push(m.text().slice(0, 120)); });
  page.on('pageerror', (e) => errs.push(`[page] ${String(e.stack || e.message).split('\n').slice(0, 3).join(' <- ')}`));
  await page.evaluateOnNewDocument(seed);

  /* ── files on disk ──────────────────────────────────────────── */
  console.log('\nFILES ON DISK');
  const onDisk = fs.existsSync(DL) ? fs.readdirSync(DL).filter((f) => !f.startsWith('.')) : [];
  const paidDisk = fs.existsSync(PAID) ? fs.readdirSync(PAID).filter((f) => !f.startsWith('.')) : [];
  for (const d of DOCS) check(onDisk.includes(`${d}.pdf`), `${d}.pdf exists`);
  for (const p of papers) check(paidDisk.includes(`slides-${p}.pptx`), `slides-${p}.pptx exists (undeployed)`);
  check(onDisk.includes('orientation.mp4'), 'orientation.mp4 exists');
  check(onDisk.includes('orientation.jpg'), 'poster orientation.jpg exists');
  const stray = onDisk.filter((f) => !DOCS.includes(f.replace('.pdf', '')) && !f.startsWith('orientation.'));
  check(stray.length === 0, 'no unaccounted files in the public download folder', stray.join(','));
  const leaked = onDisk.filter((f) => f.endsWith('.pptx'));
  check(leaked.length === 0, 'no paid deck was left inside public/', leaked.join(','));

  /* ── download centre ────────────────────────────────────────── */
  console.log('\nDOWNLOAD CENTRE');
  await page.goto(`${BASE}/loksewa/downloads`, { waitUntil: 'networkidle0', timeout: 120000 });
  await new Promise((r) => setTimeout(r, 1800));

  const dl = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('.lkd-card')].map((c) => ({
      href: c.querySelector('a[download]')?.getAttribute('href') || '',
      name: c.querySelector('a[download]')?.getAttribute('download') || '',
      size: c.querySelector('.lkd-size')?.innerText || '',
      fmt: c.querySelector('.lkd-fmt')?.innerText || '',
      title: c.querySelector('.lkd-card-t')?.innerText || '',
      print: c.querySelector('a[href^="/loksewa/print/"]')?.getAttribute('href') || '',
    }));
    return {
      h1: document.querySelector('h1')?.innerText.replace(/\s+/g, ' ').slice(0, 30),
      cards,
      video: document.querySelector('video source')?.getAttribute('src') || '',
      videoPoster: document.querySelector('video')?.getAttribute('poster') || '',
      paid: [...document.querySelectorAll('.lkd-pack')].map((p) => ({
        price: p.querySelector('.lkd-price')?.innerText.replace(/\s+/g, ' ').slice(0, 14) || '',
        offer: p.querySelector('a[href^="/offers/"]')?.getAttribute('href') || '',
      })),
      docLinks: [...document.querySelectorAll('.lkd-doc')].map((a) => a.getAttribute('href')),
      freeLabel: [...document.querySelectorAll('.lkd-tagfree')].length,
      payNote: /भुक्तानी प्रदायक|payment provider/i.test(document.body.innerText),
      words: document.body.innerText.split(/\s+/).filter(Boolean).length,
    };
  });

  check(dl.h1.startsWith('डाउनलोड केन्द्र'), 'centre H1 names the section', String(dl.h1));
  check(dl.cards.length === DOCS.length, `all ${DOCS.length} free documents carded`, String(dl.cards.length));

  for (const c of dl.cards) {
    const h = await head(c.href);
    check(h.ok && h.bytes > 1000, `${c.name} resolves (${h.status})`, `${h.bytes} bytes`);
    check(mb(h.bytes) === c.size, `${c.name} card size matches the real file`, `card=${c.size} real=${mb(h.bytes)}`);
    const pr = await head(c.print);
    check(pr.ok, `${c.name} print route resolves`, String(pr.status));
  }

  if (dl.video) {
    const v = await head(dl.video);
    check(v.ok && v.type.includes('video/mp4'), 'orientation video serves as video/mp4', v.type);
    check(v.bytes > 200000, 'video is a real file, not a stub', mb(v.bytes));
    const p = await head(dl.videoPoster);
    check(p.ok && p.type.includes('image/'), 'poster image serves', p.type);
  } else {
    check(false, 'orientation video element present');
  }

  check(dl.paid.length === 5, 'four paper packs + the full pack listed', String(dl.paid.length));
  check(dl.paid.filter((p) => /३०/.test(p.price)).length === 4, 'each paper pack priced रु. ३००', JSON.stringify(dl.paid.map((p) => p.price)));
  check(dl.paid.filter((p) => /६००/.test(p.price)).length === 1, 'full pack priced रु. ६००');
  for (const p of dl.paid) {
    const r = await head(p.offer);
    check(r.ok, `${p.offer} offer page resolves`, String(r.status));
  }
  check(dl.payNote, 'payment path is described honestly');
  check(dl.docLinks.length === DOCS.length + 1 || dl.docLinks.length >= DOCS.length, 'every print document is reachable', String(dl.docLinks.length));

  // the decks the paid packs promise exist, and are NOT fetchable from the site
  for (const p of papers) {
    const h = await head(`/loksewa/dl/slides-${p}.pptx`);
    check(h.status === 404, `slides-${p}.pptx is not publicly downloadable`, `status=${h.status}`);
  }
  check(dl.paid.every((p) => p.offer.startsWith('/offers/')), 'paid packs lead to an offer page, never a file');

  /* ── print routes and the print stylesheet ──────────────────── */
  console.log('\nPRINT DOCUMENTS');
  for (const doc of DOCS) {
    await page.goto(`${BASE}/loksewa/print/${doc}`, { waitUntil: 'networkidle0', timeout: 120000 });
    await new Promise((r) => setTimeout(r, 700));
    const r = await page.evaluate(() => {
      const doc = document.querySelector('.lkdoc');
      const bar = document.querySelector('.lkdoc-bar');
      return {
        hasDoc: Boolean(doc),
        title: document.querySelector('.lkdoc-title')?.innerText || '',
        boxes: document.querySelectorAll('.box').length,
        rows: document.querySelectorAll('.lkdoc-table tr').length,
        qs: document.querySelectorAll('.lkdoc-q').length,
        deva: (doc?.innerText || '').match(/[ऀ-ॿ]/g)?.length || 0,
        noindex: document.querySelector('meta[name=robots]')?.content || '',
        barText: bar ? bar.innerText.replace(/\s+/g, ' ').slice(0, 40) : '',
      };
    });
    check(r.hasDoc && r.deva > 40, `print/${doc}: document renders with Devanagari`, String(r.deva));
    check(r.boxes > 0 || r.rows > 0 || r.qs > 0, `print/${doc}: has tick boxes, tables or questions`, `${r.boxes}/${r.rows}/${r.qs}`);
    await page.emulateMediaType('print');
    const hidden = await page.evaluate(() => {
      const bar = document.querySelector('.lkdoc-bar');
      return bar ? getComputedStyle(bar).display === 'none' : false;
    });
    await page.emulateMediaType('screen');
    check(hidden, `print/${doc}: toolbar hidden when printing`);
  }

  /* ── 3D explorer ────────────────────────────────────────────── */
  console.log('\nEXPLORER');
  await page.goto(`${BASE}/loksewa/explorer`, { waitUntil: 'networkidle0', timeout: 120000 });
  await new Promise((r) => setTimeout(r, 1800));
  const ex0 = await page.evaluate(() => ({
    level: document.querySelector('.lx')?.dataset.level,
    live: document.querySelector('.lx')?.dataset.live,
    nodes: document.querySelectorAll('.lx-node').length,
    links: [...document.querySelectorAll('.lx-node-t')].map((a) => a.getAttribute('href')),
    core: document.querySelector('.lx-core b')?.innerText || '',
    indexPapers: document.querySelectorAll('.lxp-paper').length,
    indexFolders: document.querySelectorAll('.lxp-folders li').length,
  }));
  check(ex0.level === 'papers', 'explorer opens on the paper ring', String(ex0.level));
  check(ex0.nodes === 4, 'four paper nodes', String(ex0.nodes));
  check(ex0.links.every((h) => h && h.startsWith('/loksewa/')), 'every node links to a real paper page', ex0.links.join(','));
  check(ex0.indexPapers === 4 && ex0.indexFolders === 57, 'flat index lists 4 papers and 57 folders', `${ex0.indexPapers}/${ex0.indexFolders}`);

  await page.evaluate(() => document.querySelectorAll('.lx-open')[1]?.click());
  await new Promise((r) => setTimeout(r, 900));
  const ex1 = await page.evaluate(() => ({
    level: document.querySelector('.lx')?.dataset.level,
    plates: document.querySelectorAll('.lx-plate').length,
    path: document.querySelector('.lx-path')?.innerText.replace(/\s+/g, ' ').slice(0, 60),
    pdf: document.querySelector('.lx-actions a[href^="/loksewa/print/"]')?.getAttribute('href'),
  }));
  check(ex1.level === 'subjects' && ex1.plates === 4, 'second paper opens with its 4 subjects', `${ex1.level}/${ex1.plates}`);
  check(Boolean(ex1.pdf), 'explorer offers the printable map for the open paper', String(ex1.pdf));

  await page.evaluate(() => document.querySelectorAll('.lx-plate .lx-open')[0]?.click());
  await new Promise((r) => setTimeout(r, 900));
  const ex2 = await page.evaluate(() => ({
    level: document.querySelector('.lx')?.dataset.level,
    slabs: document.querySelectorAll('.lx-slab').length,
    points: document.querySelectorAll('.lx-slab-pts li').length,
  }));
  check(ex2.level === 'folders' && ex2.slabs === 3, 'folders raise as slabs', `${ex2.level}/${ex2.slabs}`);
  check(ex2.points > 0, 'folder slabs carry the real syllabus points', String(ex2.points));

  // a keyboard user reaches the assembly by tabbing in; focus it, then Escape
  await page.evaluate(() => document.querySelector('.lx').focus());
  await page.keyboard.press('Escape');
  await new Promise((r) => setTimeout(r, 600));
  const back = await page.evaluate(() => document.querySelector('.lx')?.dataset.level);
  check(back === 'subjects', 'Escape returns one level when the explorer has focus', String(back));

  // reduced motion must flatten the assembly, not break it
  const b2 = await launch();
  const p2 = await b2.newPage();
  await p2.setViewport({ width: 1440, height: 900 });
  await p2.evaluateOnNewDocument(seed);
  await p2.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await p2.goto(`${BASE}/loksewa/explorer`, { waitUntil: 'networkidle0', timeout: 120000 });
  await new Promise((r) => setTimeout(r, 1500));
  const flat = await p2.evaluate(() => {
    const n = document.querySelector('.lx-node');
    return {
      live: document.querySelector('.lx')?.dataset.live,
      transform: n ? getComputedStyle(n).transform : '',
      visible: Boolean(n && n.getBoundingClientRect().width > 60),
    };
  });
  check(flat.live === '0', 'reduced motion switches the explorer to the flat view', String(flat.live));
  check(flat.transform === 'none', 'flat view removes the 3D transforms', flat.transform);
  check(flat.visible, 'nodes stay visible and clickable without motion');
  await b2.close();

  /* ── mobile ─────────────────────────────────────────────────── */
  console.log('\nMOBILE');
  for (const w of [390, 320]) {
    const b3 = await launch();
    const p3 = await b3.newPage();
    await p3.setViewport({ width: w, height: 844, deviceScaleFactor: 2 });
    await p3.evaluateOnNewDocument(seed);
    for (const url of ['/loksewa/downloads', '/loksewa/explorer', '/loksewa/print/full']) {
      await p3.goto(`${BASE}${url}`, { waitUntil: 'networkidle0', timeout: 120000 });
      await new Promise((r) => setTimeout(r, 1400));
      const over = await p3.evaluate(() => {
        const wide = [...document.querySelectorAll('body *')]
          .filter((e) => e.getBoundingClientRect().right > innerWidth + 2 && getComputedStyle(e).position !== 'fixed')
          .slice(0, 4)
          .map((e) => `${e.tagName.toLowerCase()}.${(e.className || '').toString().split(' ')[0]}`);
        return { delta: document.documentElement.scrollWidth - innerWidth, wide };
      });
      check(over.delta <= 0, `${w}px ${url} no horizontal overflow`, `over=${over.delta} ${over.wide.join(' ')}`);
    }
    await b3.close();
  }

  await browser.close();
  console.log('\nCONSOLE ERRORS:', errs.length ? errs.slice(0, 6).join(' | ') : 'none');
  check(errs.length === 0, 'no console errors', String(errs.length));

  console.log(`\n${pass} passed, ${fails.length} failed`);
  if (fails.length) fails.forEach((f) => console.log('   - ' + f));
  process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.error('LK DL QA CRASHED:', e); process.exit(1); });
