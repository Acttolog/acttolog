/**
 * Mission-control deck QA — recomposed "no repeated facts" dashboard.
 *   node tools/serve-static.js .static-build/out 8140
 *   DECK_BASE=http://127.0.0.1:8140 node tools/deck-qa.js
 * Covers: 15 cards (source ledger dk-b, live wire dk-e, pointer studio dk-o,
 * live-notice dk-n), ecosystem map without repeated counts, 5-tool bench,
 * appearance studio (19 themes incl. glass/crystal/veil + density/motion/glass/
 * glow), 16-entry launchpad search+keyboard, device pulse, NE, mobile 390/320
 * rail, OS reduced-motion, console/page errors.
 */
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE = process.env.DECK_BASE || 'http://127.0.0.1:8140';
const OUT = process.env.DECK_OUT || 'C:/Users/acttolog/AppData/Local/arcadeqa/deck';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(OUT, { recursive: true });

// The Content Index (dk-c) must mirror the real ledger, not a hand-kept figure.
// Replicate src/lib/content pub() over the merged content exactly (signed-out
// visitor): hidden items out, scheduled items only once publishAt <= now,
// members-only content out. The ledger is seed.json PLUS the curated
// extensions.json merge that content/index.ts performs at import time —
// counting seed alone understates darkroom by the drExtra rows.
// Deck stat order is posts, games, resources, academy, entertainment, research
// (see HomeDeck stats[]).
const seed = require(path.join(__dirname, '..', 'src', 'lib', 'content', 'seed.json'));
const ext = require(path.join(__dirname, '..', 'src', 'lib', 'content', 'extensions.json'));
const drMerged = [...seed.dr];
for (const r of ext.drExtra || []) {
  const id = `dr_${r.slug}`;
  if (!drMerged.some((x) => x.id === id)) drMerged.push({ ...r, id, status: 'published', visible: true });
}
const pubCount = (list) =>
  (Array.isArray(list) ? list : [])
    .filter((x) => {
      if (x.visible === false) return false;
      if (x.status === 'scheduled') {
        const at = x.publishAt ? new Date(x.publishAt).getTime() : 0;
        return Boolean(at && at <= Date.now());
      }
      return (x.status ?? 'published') === 'published';
    })
    .filter((x) => !x.audience || x.audience !== 'members').length;
const LEDGER = [
  pubCount(seed.posts),
  pubCount(seed.games),
  pubCount(drMerged),
  pubCount(seed.academy && seed.academy.courses),
  pubCount(seed.entertainment),
  pubCount(seed.services),
];

let pass = 0;
const fails = [];
const check = (name, ok, detail = '') => {
  if (ok) {
    pass++;
    console.log('  ok   ' + name);
  } else {
    fails.push(name + (detail ? ' — ' + detail : ''));
    console.log('  FAIL ' + name + (detail ? ' — ' + detail : ''));
  }
};

// React-controlled inputs need the native value setter + an input event.
const setVal = (page, sel, value) =>
  page.evaluate(
    (s, v) => {
      const el = document.querySelector(s);
      if (!el) return false;
      const desc = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value');
      desc.set.call(el, v);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    },
    sel,
    value,
  );

const clickText = (page, sel, txt) =>
  page.evaluate(
    (s, t) => {
      const el = [...document.querySelectorAll(s)].find((x) => x.textContent.trim() === t);
      if (!el) return false;
      el.click();
      return true;
    },
    sel,
    txt,
  );

const clickTab = (page, i) => page.evaluate((n) => document.querySelectorAll('.tb-tab')[n]?.click(), i);

// The SSR HTML already contains all 15 cards and a `--:--:--` clock placeholder,
// so a card-count wait resolves BEFORE React hydrates. The clock only shows a
// real time once HomeDeck's effect runs — that is the true hydration signal.
//
// Headless software-WebGL blocks the main thread for seconds at a time (the R3F
// globe + aurora shaders compile synchronously), which freezes in-page rAF and
// makes waitForFunction's wall-clock timeout fire mid-animation. Poll from Node
// instead: page.evaluate queues behind the block and resolves with the settled
// value once the thread frees, so these checks stay deterministic under load
// while keeping the default full-motion, WebGL-on experience.
const pollUntil = async (p, fn, arg, timeout = 25000, interval = 400) => {
  const deadline = Date.now() + timeout;
  let last;
  for (;;) {
    last = await p.evaluate(fn, arg).catch(() => undefined);
    if (last) return last;
    if (Date.now() >= deadline) return last;
    await sleep(interval);
  }
};
const waitHydrated = (p, timeout = 30000) =>
  pollUntil(
    p,
    () => {
      const c = document.querySelector('.dk-clock')?.textContent || '';
      return /^\d{2}:\d{2}:\d{2}$/.test(c) ? c : null;
    },
    undefined,
    timeout,
  );

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding',
      '--disable-backgrounding-occluded-windows',
      '--disable-features=CalculateNativeWinOcclusion',
      '--enable-unsafe-swiftshader',
      '--use-angle=swiftshader',
    ],
  });
  const page = await browser.newPage();
  const errs = [];
  const wire = (p, tag = '') => {
    // Track failed requests by URL so benign Next RSC prefetch 404s can be
    // excluded precisely. On a static host the dotted `__next.<seg>.__PAGE__.txt`
    // payload is absent and the router falls back to a full page load (MPA) —
    // expected, not a defect. Real asset 404s and JS exceptions still fail.
    p.on('response', (r) => {
      const u = r.url();
      if (r.status() >= 400 && !/__next\.[^/]*\.txt|[?&]_rsc=|favicon/i.test(u)) errs.push((tag + r.status() + ' ' + u).slice(0, 160));
    });
    p.on('console', (m) => {
      const txt = m.text();
      if (m.type() === 'error' && !/Failed to load resource|WebGL|THREE|favicon/i.test(txt)) errs.push((tag + txt).slice(0, 160));
    });
    p.on('pageerror', (e) => {
      if (!/WebGL|THREE/i.test(e.message)) errs.push((tag + e.message).slice(0, 160));
    });
  };
  wire(page);
  const seed = () => {
    try {
      localStorage.setItem('act_welcomed', '1');
      localStorage.setItem('act_consent', JSON.stringify({ necessary: true, analytics: false, personalization: false }));
    } catch {}
  };
  await page.evaluateOnNewDocument(seed);
  await page.setViewport({ width: 1440, height: 900 });

  console.log('\nDECK · EN');
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitHydrated(page);
  await sleep(400);
  // Bring the Content Index card fully into view so its IntersectionObserver
  // fires and the CountUp figures animate. Use instant behavior to bypass the
  // page's smooth-scroll, which headless does not always complete.
  await page.evaluate(() => document.querySelector('.dk-c')?.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await pollUntil(
    page,
    () => {
      const s = [...document.querySelectorAll('.dk-stat b')].map((b) => +b.textContent.replace(/,/g, ''));
      return s.length === 6 && s.every((n) => n > 0) ? s : null;
    },
    undefined,
    25000,
  );
  await sleep(200);
  const deck = await page.evaluate(() => ({
    cards: document.querySelectorAll('.deck-card').length,
    clock: document.querySelector('.dk-clock')?.textContent || '',
    date: document.querySelector('.dk-date')?.textContent || '',
    stats: [...document.querySelectorAll('.dk-stat b')].map((b) => +b.textContent.replace(/,/g, '')),
    cadBars: document.querySelectorAll('.dk-cad-bar').length,
    srcled: !!document.querySelector('.dk-b .srcled'),
    ledgerRows: [...document.querySelectorAll('.srcled .dk-net li')].map((li) => {
      const a = li.querySelector('a');
      return {
        href: a?.getAttribute('href') || '',
        target: a?.getAttribute('target') || '',
        rel: a?.getAttribute('rel') || '',
        dot: !!li.querySelector('.dk-dot'),
        name: li.querySelector('.dk-net-name')?.textContent.trim() || '',
        status: li.querySelector('.dk-status')?.textContent.trim() || '',
      };
    }),
    ledgerTime: document.querySelector('.srcled-foot time')?.getAttribute('datetime') || '',
    ledgerNote: document.querySelector('.srcled-note')?.textContent || '',
    statuses: [...document.querySelectorAll('#deck .dk-status')].map((s) => s.textContent.trim()),
    deckText: document.querySelector('#deck')?.textContent || '',
    wire: !!document.querySelector('.dk-e .wire'),
    wireRows: [...document.querySelectorAll('.wire .dk-feed li')].map((li) => ({
      kind: li.querySelector('.dk-kind')?.textContent.trim() || '',
      title: li.querySelector('.dk-feed-title')?.textContent.trim() || '',
      date: li.querySelector('.dk-feed-date')?.textContent.trim() || '',
      href: li.querySelector('a')?.getAttribute('href') || '',
    })),
    wirePulse: !!document.querySelector('.wire .wire-pulse'),
    wireTime: document.querySelector('.wire time')?.getAttribute('datetime') || '',
    ecoChipN: document.querySelectorAll('.eco-chip-n').length,
    ecoNodeNum: document.querySelectorAll('.eco-node-num').length,
    quick: [...document.querySelectorAll('.dk-tile')].map((a) => ({
      href: a.getAttribute('href'),
      img: a.querySelector('img')?.naturalWidth || 0,
    })),
    price: document.querySelector('.dk-price')?.textContent || '',
    noticeCards: document.querySelectorAll('.dk-n .nb-card').length,
    noticeViewAll: document.querySelector('.dk-n .nb-viewall')?.getAttribute('href') || '',
    noticeLive: !!document.querySelector('.dk-n .nb-live-tag'),
    noticeSource: document.querySelector('.dk-n .nb-source')?.getAttribute('href') || '',
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  }));
  check('fifteen deck cards', deck.cards === 15, 'got ' + deck.cards);
  check('clock shows NPT time', /^\d{2}:\d{2}:\d{2}$/.test(deck.clock), deck.clock);
  check('clock date line', /\d{4}/.test(deck.date), deck.date);
  const c1 = deck.clock;
  // The 1s interval can be starved for seconds while the main thread compiles
  // shaders; poll from Node so the read queues behind the block.
  const c2 = await pollUntil(
    page,
    (prev) => {
      const c = document.querySelector('.dk-clock')?.textContent || '';
      return c && c !== prev ? c : null;
    },
    c1,
    20000,
  );
  check('clock ticks', !!c2 && c2 !== c1, `${c1} -> ${c2}`);
  check('six real counters > 0', deck.stats.length === 6 && deck.stats.every((n) => n > 0), JSON.stringify(deck.stats));
  // CountUp animates; wait for the figures to settle on the ledger values.
  const statsFinal = await pollUntil(
    page,
    (want) => {
      const s = [...document.querySelectorAll('.dk-stat b')].map((b) => +b.textContent.replace(/,/g, ''));
      return s.length === 6 && s.every((n, i) => n === want[i]) ? s : null;
    },
    LEDGER,
    20000,
  );
  check(
    'content index equals the real ledger counts',
    Array.isArray(statsFinal) && statsFinal.every((n, i) => n === LEDGER[i]),
    `got ${JSON.stringify(deck.stats)} want ${JSON.stringify(LEDGER)}`,
  );
  check('six cadence bars', deck.cadBars === 6, 'got ' + deck.cadBars);
  // dk-b is now the Source Ledger: measured reachability of official portals,
  // never a "DIVISIONS ONLINE" list.
  check('source ledger card present', deck.srcled);
  check('source ledger lists >=5 official portals', deck.ledgerRows.length >= 5, 'got ' + deck.ledgerRows.length);
  check(
    'ledger rows are external portal links with dot/name/status',
    deck.ledgerRows.length >= 5 &&
      deck.ledgerRows.every(
        (r) =>
          /^https?:\/\//.test(r.href) &&
          r.target === '_blank' &&
          /noopener/.test(r.rel) &&
          /noreferrer/.test(r.rel) &&
          r.dot &&
          r.name.length > 0 &&
          r.status.length > 0,
      ),
    JSON.stringify(deck.ledgerRows.slice(0, 3)),
  );
  check(
    'ledger statuses are reachability, never ONLINE',
    deck.statuses.length > 0 &&
      deck.statuses.every((s) => !/ONLINE/i.test(s) && /^(VERIFIED|NO RESPONSE|BOT CHECK|प्रमाणित|प्रतिक्रिया छैन|बोट जाँच)$/i.test(s)),
    JSON.stringify(deck.statuses),
  );
  check(
    'old DIVISIONS ONLINE / LATEST DISPATCH headings gone',
    !/DIVISIONS ONLINE|LATEST DISPATCH/i.test(deck.deckText),
  );
  check('ledger foot carries a compiled <time datetime>', Number.isFinite(Date.parse(deck.ledgerTime)), deck.ledgerTime);
  check(
    'ledger disclosure: automated reachability, not a vacancy feed',
    /reachability/i.test(deck.ledgerNote) && /vacancy feed/i.test(deck.ledgerNote) && /\bnot\b/i.test(deck.ledgerNote),
    deck.ledgerNote.slice(0, 120),
  );
  // dk-e is now the Live Wire: six dated ledger events, not "latest dispatch".
  const WIRE_KINDS = ['NEW', 'NOTICE', 'VERIFIED', 'NO RESPONSE', 'BOT CHECK', 'CLOSING', 'नयाँ', 'सूचना', 'प्रमाणित', 'प्रतिक्रिया छैन', 'बोट जाँच', 'बन्द हुँदै'];
  check('live wire card present', deck.wire);
  check('six wire rows', deck.wireRows.length === 6, 'got ' + deck.wireRows.length);
  check(
    'wire rows carry kind/title/date',
    deck.wireRows.length === 6 &&
      deck.wireRows.every((r) => WIRE_KINDS.includes(r.kind) && r.title.length > 0 && r.date.length > 0),
    JSON.stringify(deck.wireRows.map((r) => r.kind)),
  );
  check(
    'wire rows link real routes',
    deck.wireRows.length === 6 && deck.wireRows.every((r) => /^(\/|https?:\/\/)/.test(r.href)),
    JSON.stringify(deck.wireRows.map((r) => r.href)),
  );
  check('wire pulse dot present', deck.wirePulse);
  check('wire carries a compiled <time datetime>', Number.isFinite(Date.parse(deck.wireTime)), deck.wireTime);
  check('six quick-play tiles', deck.quick.length === 6, 'got ' + deck.quick.length);
  check('quick tiles link direct to arcade', deck.quick.every((q) => (q.href || '').startsWith('/arcade/index.html?game=')), JSON.stringify(deck.quick.map((q) => q.href)));
  check('quick thumbs load', deck.quick.every((q) => q.img > 0), JSON.stringify(deck.quick.map((q) => q.img)));
  check('offer price in NPR', /^Rs [\d,]+$/.test(deck.price.trim()), deck.price);
  check('deck desktop fits', !deck.overflow);
  check('deck live-notice card shows five notices', deck.noticeCards === 5, 'got ' + deck.noticeCards);
  check('deck notice card has LIVE tag', deck.noticeLive);
  check('deck notice view-all links to Loksewa board', deck.noticeViewAll === '/loksewa#lk-notices', deck.noticeViewAll);
  // ACTTOLOG-owned notices link internally (e.g. the free practice test);
  // external portal notices link the real official source. Both are honest.
  check('deck notice links a real source', /^(https?:\/\/|\/loksewa#)/.test(deck.noticeSource), deck.noticeSource);
  await page.evaluate(() => document.querySelector('#deck')?.scrollIntoView({ block: 'start', behavior: 'instant' }));
  await sleep(400);
  await page.screenshot({ path: OUT + '/pro-dark.png' });

  console.log('\nECOSYSTEM MAP');
  const eco = await page.evaluate(() => ({
    svg: !!document.querySelector('.eco-svg'),
    nodes: document.querySelectorAll('.eco-node').length,
    chips: document.querySelectorAll('.eco-chip').length,
    core: +(document.querySelector('.eco-core-num')?.textContent || '0').replace(/,/g, ''),
    chipHref: document.querySelector('.eco-chip')?.getAttribute('href'),
  }));
  check('ecosystem svg renders', eco.svg);
  check('five orbital nodes', eco.nodes === 5, 'got ' + eco.nodes);
  check('five legend chips', eco.chips === 5, 'got ' + eco.chips);
  check('map repeats no counts (.eco-chip-n / .eco-node-num removed)', deck.ecoChipN === 0 && deck.ecoNodeNum === 0, `chip-n=${deck.ecoChipN} node-num=${deck.ecoNodeNum}`);
  check('core total > 0', eco.core > 0, 'got ' + eco.core);
  check('chip links to a division', /^\//.test(eco.chipHref || ''), eco.chipHref);
  await page.hover('.eco-node');
  await sleep(300);
  const ecoDetail = await page.evaluate(() => ({
    on: document.querySelectorAll('.eco-node.on').length,
    detail: document.querySelector('.eco-detail b')?.textContent || '',
  }));
  check('hover activates a node', ecoDetail.on >= 1, 'on=' + ecoDetail.on);
  check('detail names the division', ecoDetail.detail.length > 0, ecoDetail.detail);
  await page.screenshot({ path: OUT + '/pro-ecosystem.png' });

  console.log('\nTOOL BENCH · CONVERT');
  const tabs = await page.evaluate(() => document.querySelectorAll('.tb-tab').length);
  check('five tool tabs', tabs === 5, 'got ' + tabs);
  await clickText(page, '.tb-convert .tb-seg-btn', 'Temperature');
  await sleep(200);
  await setVal(page, '#tb-conv-val', '100');
  await sleep(200);
  const conv = await page.evaluate(() => ({
    res: document.querySelector('.tb-result-num')?.textContent || '',
    from: document.querySelector('#tb-conv-from')?.value,
    to: document.querySelector('#tb-conv-to')?.value,
  }));
  check('temperature 100°C → 212°F', /212/.test(conv.res) && conv.from === '°C' && conv.to === '°F', JSON.stringify(conv));

  console.log('\nTOOL BENCH · CALCULATOR');
  await clickTab(page, 1);
  await sleep(200);
  for (const k of ['7', '×', '8', '=']) await clickText(page, '.tb-calc-keys .tb-key', k);
  await sleep(200);
  const calcDisp = await page.evaluate(() => document.querySelector('.tb-calc-disp')?.textContent);
  check('calculator 7 × 8 = 56', calcDisp === '56', 'got ' + calcDisp);
  await page.screenshot({ path: OUT + '/pro-calc.png' });

  console.log('\nTOOL BENCH · FOCUS');
  await clickTab(page, 2);
  await sleep(200);
  const f0 = await page.evaluate(() => document.querySelector('.tb-focus-time b')?.textContent);
  await page.evaluate(() => document.querySelector('.tb-focus-ctrl .btn-p')?.click());
  await sleep(2300);
  const f1 = await page.evaluate(() => document.querySelector('.tb-focus-time b')?.textContent);
  check('focus timer counts down', f0 === '25:00' && f1 !== '25:00', `${f0} -> ${f1}`);
  const dot = await page.evaluate(() => {
    document.querySelectorAll('.tb-tab')[0].click();
    return !!document.querySelector('.tb-tab-dot');
  });
  check('running focus shows tab dot', dot);
  await clickTab(page, 2);
  await page.evaluate(() => document.querySelector('.tb-focus-ctrl .btn-g')?.click());
  await sleep(200);
  const f2 = await page.evaluate(() => document.querySelector('.tb-focus-time b')?.textContent);
  check('focus reset restores 25:00', f2 === '25:00', 'got ' + f2);

  console.log('\nTOOL BENCH · NOTES');
  await clickTab(page, 3);
  await sleep(200);
  await page.click('.tb-textarea');
  await page.type('.tb-textarea', 'QA note 123');
  await sleep(200);
  const notes = await page.evaluate(() => ({
    saved: localStorage.getItem('act_notes'),
    foot: document.querySelector('.tb-notes-foot .dk-foot')?.textContent || '',
  }));
  check('notes autosave to device', notes.saved === 'QA note 123', notes.saved);
  check('notes char count', /11/.test(notes.foot), notes.foot);

  console.log('\nTOOL BENCH · PASSWORD');
  await clickTab(page, 4);
  await sleep(300);
  const pw0 = await page.evaluate(() => document.querySelector('.tb-key-out .tb-input')?.value || '');
  check('password generated (len 16)', pw0.length === 16, 'len ' + pw0.length);
  await setVal(page, '#tb-key-len', '24');
  await sleep(200);
  const pw1 = await page.evaluate(() => document.querySelector('.tb-key-out .tb-input')?.value || '');
  check('length slider → 24 chars', pw1.length === 24, 'len ' + pw1.length);
  await page.evaluate(() => document.querySelector('.tb-cta')?.click());
  await sleep(200);
  const pw2 = await page.evaluate(() => ({
    val: document.querySelector('.tb-key-out .tb-input')?.value || '',
    meter: document.querySelector('.tb-meter-track span')?.style.width || '',
  }));
  check('generate makes a new password', pw2.val !== pw1 && pw2.val.length === 24, pw2.val);
  check('strength meter filled', parseFloat(pw2.meter) > 0, pw2.meter);

  console.log('\nAPPEARANCE STUDIO');
  const swatches = await page.evaluate(() => document.querySelectorAll('.ap-swatch').length);
  check('nineteen theme swatches', swatches === 19, 'got ' + swatches);
  for (const [label, id, file] of [
    ['Crimson Signal', 'crimson', 'pro-crimson'],
    ['Matcha Light', 'matcha', 'pro-matcha'],
    ['Glacier Light', 'glacier', 'pro-glacier'],
    ['Frosted Glass · Premium', 'glass', 'pro-glass'],
    ['Crystal Glass · Light', 'crystal', 'pro-crystal'],
    ['Transparent Veil', 'veil', 'pro-veil'],
  ]) {
    await page.evaluate((l) => [...document.querySelectorAll('.ap-swatch')].find((x) => x.getAttribute('aria-label') === l)?.click(), label);
    await sleep(400);
    const applied = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    check(`${label} applies`, applied === id, 'got ' + applied);
    await page.evaluate(() => document.querySelector('#deck')?.scrollIntoView({ block: 'start' }));
    await sleep(300);
    await page.screenshot({ path: OUT + '/' + file + '.png' });
  }
  // Premium glass themes frost the panels with a heavier saturation than the
  // default deck (saturate 1.25). Verify the veil theme currently applied.
  const frost = await page.evaluate(() => {
    const cs = getComputedStyle(document.querySelector('.deck-card'));
    const panel = getComputedStyle(document.documentElement).getPropertyValue('--panel').trim();
    // Chrome serializes a translucent --panel to hex8 (#rrggbbaa); accept either
    // that or rgba() and derive the alpha so the check is format-agnostic.
    let alpha = 1;
    const hex8 = panel.match(/^#([0-9a-f]{6})([0-9a-f]{2})$/i);
    const rgba = panel.match(/rgba?\(([^)]+)\)/i);
    if (hex8) alpha = parseInt(hex8[2], 16) / 255;
    else if (rgba) {
      const p = rgba[1].split(/[,\/\s]+/).filter(Boolean);
      if (p.length >= 4) alpha = parseFloat(p[3]);
    }
    return {
      theme: document.documentElement.getAttribute('data-theme'),
      bf: cs.backdropFilter || '',
      wbf: cs.webkitBackdropFilter || '',
      panel,
      alpha,
    };
  });
  check('glass theme frosts deck cards', frost.theme === 'veil' && /saturate\(1\.7\)/.test(frost.bf), JSON.stringify(frost));
  check('glass theme panel is translucent', frost.alpha > 0 && frost.alpha < 1, `${frost.panel} alpha=${frost.alpha.toFixed(2)}`);
  await clickText(page, '.ap-grid .tb-seg-btn', 'Compact');
  await sleep(200);
  const dense = await page.evaluate(() => ({
    attr: document.querySelector('.deck')?.getAttribute('data-density'),
    pad: getComputedStyle(document.querySelector('.deck-card')).paddingTop,
  }));
  check('compact density applies', dense.attr === 'compact' && dense.pad === '13px', JSON.stringify(dense));
  await clickText(page, '.ap-grid .tb-seg-btn', 'Reduced');
  await sleep(200);
  const mot = await page.evaluate(() => ({
    attr: document.querySelector('.deck')?.getAttribute('data-motion'),
    anim: getComputedStyle(document.querySelector('.deck-card')).animationName,
  }));
  check('reduced motion applies', mot.attr === 'reduced' && mot.anim === 'none', JSON.stringify(mot));
  await setVal(page, '#ap-glass', '20');
  await setVal(page, '#ap-glow', '30');
  await sleep(200);
  const gg = await page.evaluate(() => {
    const s = document.querySelector('.deck').style;
    return { blur: s.getPropertyValue('--deck-blur').trim(), glow: s.getPropertyValue('--deck-glow').trim() };
  });
  check('glass blur drives --deck-blur', gg.blur === '3.6px', JSON.stringify(gg));
  check('glow drives --deck-glow', gg.glow === '0.30', JSON.stringify(gg));
  const beforeShuffle = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  await page.evaluate(() => document.querySelector('.ap-actions .btn')?.click());
  await sleep(300);
  const afterShuffle = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  check('shuffle changes theme', afterShuffle !== beforeShuffle, `${beforeShuffle} -> ${afterShuffle}`);
  await page.evaluate(() => document.querySelectorAll('.ap-actions .btn')[1]?.click());
  await sleep(300);
  const reset = await page.evaluate(() => {
    const d = document.querySelector('.deck');
    return {
      density: d.getAttribute('data-density'),
      motion: d.getAttribute('data-motion'),
      blur: d.style.getPropertyValue('--deck-blur').trim(),
      glow: d.style.getPropertyValue('--deck-glow').trim(),
    };
  });
  check('reset restores appearance defaults', reset.density === 'comfortable' && reset.motion === 'full' && reset.blur === '12.6px' && reset.glow === '0.60', JSON.stringify(reset));
  await page.evaluate(() => [...document.querySelectorAll('.ap-swatch')].find((x) => x.getAttribute('aria-label') === 'Obsidian (default)')?.click());
  await sleep(300);

  console.log('\nPOINTER STUDIO');
  // dk-o steers the magnetic cursor overlay. MagneticPointer.tsx may not have
  // landed yet: when no `.mag-pointer` overlay exists, the live contract is the
  // `act_pointer` prefs key in localStorage — moving a slider must rewrite it.
  await page.evaluate(() => document.querySelector('.dk-o')?.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await sleep(400);
  const ptr = await page.evaluate(() => {
    const root = document.querySelector('.ptr');
    if (!root) return { present: false };
    const visible = (el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    };
    const overlay = document.querySelector('.mag-pointer, [class*="mag-pointer"]');
    const snap = () => {
      const o = document.querySelector('.mag-pointer, [class*="mag-pointer"]');
      if (!o) return null;
      const cs = getComputedStyle(o);
      return { css: o.style.cssText, transform: cs.transform, w: cs.width, h: cs.height, op: cs.opacity, bg: cs.background.slice(0, 100), shadow: cs.boxShadow.slice(0, 100) };
    };
    const range = root.querySelector('input[type=range]');
    return {
      present: true,
      inCard: !!document.querySelector('.dk-o') && document.querySelector('.dk-o').contains(root),
      ranges: root.querySelectorAll('input[type=range]').length,
      selects: root.querySelectorAll('select').length,
      btns: [...root.querySelectorAll('button')].map((b) => b.textContent.trim()),
      toggle: [...root.querySelectorAll('input[type=checkbox], [role="switch"], button[aria-pressed]')].some(visible),
      overlay: !!overlay,
      range: range ? { value: range.value, min: range.min, max: range.max } : null,
      before: { ls: localStorage.getItem('act_pointer'), ov: snap() },
    };
  });
  check('pointer studio lives in dk-o', ptr.present && ptr.inCard, JSON.stringify({ present: ptr.present, inCard: ptr.inCard }));
  check('pointer studio has >=7 sliders', ptr.ranges >= 7, 'got ' + ptr.ranges);
  check('pointer studio has a select', ptr.selects >= 1, 'got ' + ptr.selects);
  check(
    'pointer studio offers Reset / Randomize / Export',
    (ptr.btns || []).some((b) => /reset/i.test(b)) && (ptr.btns || []).some((b) => /random/i.test(b)) && (ptr.btns || []).some((b) => /export/i.test(b)),
    JSON.stringify(ptr.btns || []),
  );
  check('pointer studio enable toggle is visible', ptr.toggle);
  let ptrMoved = false;
  let ptrDetail = 'no .ptr controls';
  if (ptr.present && ptr.range) {
    const target = String(ptr.range.value) === String(ptr.range.max) ? ptr.range.min : ptr.range.max;
    await setVal(page, '.ptr input[type=range]', target);
    await sleep(400);
    const after = await page.evaluate(() => {
      const o = document.querySelector('.mag-pointer, [class*="mag-pointer"]');
      const cs = o ? getComputedStyle(o) : null;
      return {
        ls: localStorage.getItem('act_pointer'),
        ov: o ? { css: o.style.cssText, transform: cs.transform, w: cs.width, h: cs.height, op: cs.opacity, bg: cs.background.slice(0, 100), shadow: cs.boxShadow.slice(0, 100) } : null,
      };
    });
    if (ptr.before.ov || after.ov) {
      ptrMoved = JSON.stringify(ptr.before.ov) !== JSON.stringify(after.ov);
      ptrDetail = `overlay ${ptrMoved ? 'changed' : 'UNCHANGED'} · act_pointer ${ptr.before.ls === after.ls ? 'same' : 'rewritten'}`;
    } else {
      ptrMoved = Boolean(after.ls) && after.ls !== ptr.before.ls;
      ptrDetail = `act_pointer ${String(ptr.before.ls).slice(0, 40)} -> ${String(after.ls).slice(0, 40)}`;
    }
    // Leave the studio at its defaults for the persistence pass below.
    await page.evaluate(() => [...document.querySelectorAll('.ptr button')].find((b) => /reset/i.test(b.textContent))?.click());
    await sleep(250);
  }
  check('moving a slider drives the cursor overlay (or act_pointer prefs)', ptrMoved, ptrDetail);

  console.log('\nLAUNCHPAD');
  const lp0 = await page.evaluate(() => ({
    count: document.querySelectorAll('.lp-list .lp-item').length,
    kinds: [...document.querySelectorAll('.lp-list .lp-kind')].map((k) => k.textContent.trim()),
  }));
  check('launchpad lists sixteen destinations', lp0.count === 16, 'got ' + lp0.count);
  check(
    'launchpad kinds are Page/Tool only (no Division)',
    lp0.kinds.length === 16 && lp0.kinds.every((k) => ['Page', 'Tool', 'पृष्ठ', 'औजार'].includes(k)),
    JSON.stringify([...new Set(lp0.kinds)]),
  );
  await page.click('.lp-input');
  await page.type('.lp-input', 'arcade');
  await sleep(300);
  const lp = await page.evaluate(() => ({
    count: document.querySelectorAll('.lp-list .lp-item').length,
    names: [...document.querySelectorAll('.lp-name')].map((n) => n.textContent),
    active: document.querySelectorAll('.lp-item.on').length,
  }));
  check('launchpad filters on query', lp.count > 0 && lp.count < 16, 'count ' + lp.count);
  check('launchpad matches arcade', lp.names.some((n) => /arcade/i.test(n)), JSON.stringify(lp.names));
  check('launchpad has active row', lp.active === 1, 'active ' + lp.active);
  await page.keyboard.press('ArrowDown');
  await sleep(150);
  const lpActive2 = await page.evaluate(() => [...document.querySelectorAll('.lp-item')].findIndex((x) => x.classList.contains('on')));
  check('arrow key moves selection', lpActive2 >= 0, 'idx ' + lpActive2);
  await setVal(page, '.lp-input', 'nepal');
  await sleep(250);
  await page.focus('.lp-input');
  await page.keyboard.press('Enter');
  // router.push falls back to a full page load on a static host; the heavy
  // /nepal document can take seconds to commit. Poll page.url() from Node so
  // the check survives the navigation destroying the in-page context.
  let navOk = false;
  for (let i = 0; i < 50; i++) {
    await sleep(300);
    if (/\/nepal/.test(page.url())) {
      navOk = true;
      break;
    }
  }
  check('launchpad Enter navigates', navOk, page.url());
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  // Wait for the Pulse widget to hydrate (viewport value populated) rather than
  // networkidle2, which never settles on an SPA that prefetches Link targets.
  await pollUntil(
    page,
    () => {
      const vs = [...document.querySelectorAll('.pulse-v')].map((v) => v.textContent.trim());
      return vs.length === 7 && vs.some((v) => v.startsWith(window.innerWidth + '×')) ? vs : null;
    },
    undefined,
    25000,
  );
  await sleep(300);

  console.log('\nDEVICE PULSE');
  await page.evaluate(() => document.querySelector('#deck')?.scrollIntoView({ block: 'start', behavior: 'instant' }));
  await sleep(300);
  const p0 = await page.evaluate(() => ({
    rows: document.querySelectorAll('.pulse-list li').length,
    vals: [...document.querySelectorAll('.pulse-v')].map((v) => v.textContent.trim()),
    note: document.querySelector('.pulse-note')?.textContent || '',
    vw: window.innerWidth,
  }));
  check('seven pulse rows', p0.rows === 7, 'got ' + p0.rows);
  check('pulse viewport matches window', p0.vals.some((v) => v.startsWith(p0.vw + '×')), JSON.stringify(p0.vals));
  check('pulse honesty note present', /not server traffic/i.test(p0.note), p0.note);
  const up1 = await pollUntil(
    page,
    (prev) => {
      const vs = [...document.querySelectorAll('.pulse-v')].map((v) => v.textContent.trim());
      return vs[1] && vs[1] !== prev ? vs[1] : null;
    },
    p0.vals[1],
    15000,
  );
  check('pulse uptime ticks', !!up1 && up1 !== p0.vals[1], `${p0.vals[1]} -> ${up1}`);

  console.log('\nPERSISTENCE');
  await waitHydrated(page);
  await page.evaluate(() => [...document.querySelectorAll('.ap-swatch')].find((x) => x.getAttribute('aria-label') === 'Deep Ocean')?.click());
  await sleep(400);
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
  // The inline script paints the stored theme at DCL; let hydration settle and
  // confirm it held, with no transient default-theme flash.
  await waitHydrated(page);
  await pollUntil(page, () => (document.documentElement.getAttribute('data-theme') === 'ocean' ? 'ocean' : null), undefined, 10000);
  await sleep(200);
  check('theme persists across reload', await page.evaluate(() => document.documentElement.getAttribute('data-theme') === 'ocean'));
  // A newly added LIGHT theme must be recognized by the pre-paint inline script
  // (no dark flash) with the light theme-color, then survive hydration.
  await page.evaluate(() => [...document.querySelectorAll('.ap-swatch')].find((x) => x.getAttribute('aria-label') === 'Matcha Light')?.click());
  await sleep(400);
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
  const matchaDCL = await page.evaluate(() => ({
    theme: document.documentElement.getAttribute('data-theme'),
    tc: document.querySelector('meta[name=theme-color]')?.getAttribute('content'),
  }));
  check('new light theme paints pre-hydration', matchaDCL.theme === 'matcha' && matchaDCL.tc === '#f4f7fc', JSON.stringify(matchaDCL));
  await waitHydrated(page);
  await sleep(300);
  check('new light theme persists across reload', await page.evaluate(() => document.documentElement.getAttribute('data-theme') === 'matcha'));
  // Crystal Glass is a new LIGHT theme — it must paint pre-hydration with the
  // light theme-color (no dark flash) and survive hydration + reload.
  await page.evaluate(() => [...document.querySelectorAll('.ap-swatch')].find((x) => x.getAttribute('aria-label') === 'Crystal Glass · Light')?.click());
  await sleep(400);
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
  const crystalDCL = await page.evaluate(() => ({
    theme: document.documentElement.getAttribute('data-theme'),
    tc: document.querySelector('meta[name=theme-color]')?.getAttribute('content'),
  }));
  check('crystal light theme paints pre-hydration', crystalDCL.theme === 'crystal' && crystalDCL.tc === '#f4f7fc', JSON.stringify(crystalDCL));
  await waitHydrated(page);
  await sleep(300);
  check('crystal light theme persists across reload', await page.evaluate(() => document.documentElement.getAttribute('data-theme') === 'crystal'));
  await page.evaluate(() => [...document.querySelectorAll('.ap-swatch')].find((x) => x.getAttribute('aria-label') === 'Obsidian (default)')?.click());
  await sleep(300);

  console.log('\nDECK · NE');
  await page.goto(BASE + '/ne', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitHydrated(page);
  await sleep(400);
  const ne = await page.evaluate(() => ({
    kicker: document.querySelector('.deck .kicker')?.textContent || '',
    cards: document.querySelectorAll('.deck-card').length,
    srcled: !!document.querySelector('.dk-b .srcled'),
    wire: !!document.querySelector('.dk-e .wire'),
    eco: document.querySelector('.eco .dk-kicker')?.textContent || '',
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  }));
  check('nepali deck renders 15 cards', ne.cards === 15 && /मिसन/.test(ne.kicker), JSON.stringify(ne));
  check('nepali deck carries source ledger + live wire', ne.srcled && ne.wire, JSON.stringify({ srcled: ne.srcled, wire: ne.wire }));
  check('nepali ecosystem label', /इकोसिस्टम/.test(ne.eco), ne.eco);
  check('ne desktop fits', !ne.overflow);

  console.log('\nMOBILE');
  const m = await browser.newPage();
  wire(m, 'mobile ');
  await m.evaluateOnNewDocument(seed);
  await m.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await m.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitHydrated(m);
  await sleep(500);
  await m.evaluate(() => document.querySelector('#deck')?.scrollIntoView({ block: 'start', behavior: 'instant' }));
  await sleep(600);
  check('deck fits 390', await m.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1));
  check(
    'deck becomes a snap rail with nav at 390',
    await m.evaluate(() => {
      const g = document.querySelector('.deck-grid');
      const nav = document.querySelector('.deck-rail-nav');
      if (!g || !nav) return false;
      const cs = getComputedStyle(g);
      const r = nav.getBoundingClientRect();
      return /auto|scroll/.test(cs.overflowX) && /x/.test(cs.scrollSnapType) && r.width > 0 && r.height > 0;
    }),
  );
  await m.evaluate(() => document.querySelectorAll('.tb-tab')[1]?.click());
  await sleep(200);
  for (const k of ['9', '−', '4', '=']) await clickText(m, '.tb-calc-keys .tb-key', k);
  await sleep(200);
  check('mobile calculator 9 − 4 = 5', (await m.evaluate(() => document.querySelector('.tb-calc-disp')?.textContent)) === '5');
  await m.screenshot({ path: OUT + '/pro-mobile.png', fullPage: false });
  await m.setViewport({ width: 320, height: 700, isMobile: true, hasTouch: true });
  await sleep(500);
  check('deck fits 320', await m.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1));
  await m.setViewport({ width: 768, height: 1024, isMobile: true, hasTouch: true });
  await sleep(500);
  check('deck fits 768', await m.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1));
  await m.evaluate(() => document.querySelector('#deck')?.scrollIntoView({ block: 'start', behavior: 'instant' }));
  await sleep(400);
  await m.screenshot({ path: OUT + '/pro-tablet.png', fullPage: false });
  await m.setViewport({ width: 1280, height: 800, isMobile: false, hasTouch: false });
  await sleep(500);
  check('deck fits 1280', await m.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1));
  await m.close();

  console.log('\nREDUCED MOTION (OS)');
  const r = await browser.newPage();
  wire(r, 'rm ');
  await r.evaluateOnNewDocument(seed);
  await r.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await r.setViewport({ width: 1440, height: 900 });
  await r.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await pollUntil(r, () => (document.querySelector('.deck')?.getAttribute('data-motion') === 'reduced' ? 'reduced' : null), undefined, 30000);
  await sleep(400);
  const rm = await r.evaluate(() => ({
    anim: getComputedStyle(document.querySelector('.deck-card')).animationName,
    visible: getComputedStyle(document.querySelector('.deck-card')).opacity,
    ring: getComputedStyle(document.querySelector('.eco-ring')).animationName,
    attr: document.querySelector('.deck')?.getAttribute('data-motion'),
  }));
  check('OS reduced motion disables deck entrance', rm.anim === 'none' && rm.visible === '1', JSON.stringify(rm));
  check('OS reduced motion stops ecosystem ring', rm.ring === 'none' && rm.attr === 'reduced', JSON.stringify(rm));
  await r.close();

  check('no console/page errors', errs.length === 0, errs.slice(0, 5).join(' | '));
  console.log('\nRESULT ' + pass + ' passed, ' + fails.length + ' failed');
  if (fails.length) console.log('FAILURES\n- ' + fails.join('\n- '));
  await browser.close();
  process.exit(fails.length ? 1 : 0);
})().catch((e) => {
  console.error('FATAL', e);
  process.exit(1);
});