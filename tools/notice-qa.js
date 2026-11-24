/**
 * Notice-board QA — curated, source-linked notice directory.
 *   node tools/serve-static.js .static-build/out 8140
 *   DECK_BASE=http://127.0.0.1:8140 node tools/notice-qa.js
 * Covers: Loksewa full board (35 notices; government/sansthan/bank/exam chips;
 * search, sort, save + localStorage persistence, detail expand, official source
 * links, live countdown, measured reachability badges + check freshness, honesty
 * disclosure), every division board (research/entertainment/academy/games/
 * darkroom/nepal), mobile 390/320 fit, console/page errors.
 *
 * "Live" here means live-computed status/countdown/freshness in the browser over
 * a curated ledger of real official portals — NOT an automated government feed.
 * The board must say so, and every external entry must link its official source.
 */
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Portal badges report the build-time reachability check, so the expected label
// moves with the calendar. Derive it from the ledgers instead of asserting
// "today", which would only hold on the day the check was run.
const ledger = require(path.join(__dirname, '..', 'src', 'lib', 'content', 'notices.json'));
const srcLedger = require(path.join(__dirname, '..', 'src', 'lib', 'content', 'sources.json'));
const DAY_MS = 86_400_000;
const hostOf = (u) => { try { return new URL(u).hostname.replace(/^www\./, '').toLowerCase(); } catch { return ''; } };
const reach = new Map(srcLedger.sources.map((s) => [hostOf(s.url) || s.host.toLowerCase(), s]));
const lkSources = ledger.notices.filter((n) => n.scope === 'loksewa' && n.kind === 'source');
const lkDown = lkSources.filter((n) => reach.get(hostOf(n.sourceUrl))?.status === 'unreachable').length;
const lkBlocked = lkSources.filter((n) => reach.get(hostOf(n.sourceUrl))?.status === 'blocked').length;
const lkUp = lkSources.length - lkDown - lkBlocked;
const checkDays = lkSources.map((n) => {
  const t = Date.parse(reach.get(hostOf(n.sourceUrl))?.checkedAt || '');
  return Number.isFinite(t) ? Math.max(0, Math.floor((Date.now() - t) / DAY_MS)) : 0;
});
const minCheck = Math.min(...checkDays);
const EXPECT_FRESH = `जाँचिएको ${minCheck === 0 ? 'आज' : `${minCheck} दिन अघि`}`;

const BASE = process.env.DECK_BASE || 'http://127.0.0.1:8140';
const OUT = process.env.NOTICE_OUT || 'C:/Users/acttolog/AppData/Local/arcadeqa/notices';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(OUT, { recursive: true });

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

// Headless software-WebGL blocks the main thread for seconds; poll from Node so
// the read queues behind the block and resolves with the settled value.
const pollUntil = async (p, fn, arg, timeout = 30000, interval = 400) => {
  const deadline = Date.now() + timeout;
  let last;
  for (;;) {
    last = await p.evaluate(fn, arg).catch(() => undefined);
    if (last) return last;
    if (Date.now() >= deadline) return last;
    await sleep(interval);
  }
};

// SSR renders every LiveClock as `s-idle`; the mount effect computes the real
// status. A non-idle badge is therefore the true board-hydration signal.
const waitBoard = (p, sel, timeout = 35000) =>
  pollUntil(p, (s) => (document.querySelector(s + ' .nb-status:not(.s-idle)') ? true : null), sel, timeout);

const cards = (page, sel) => page.evaluate((s) => document.querySelectorAll(s + ' .nb-card').length, sel);
const clickChip = (page, sel, i) => page.evaluate((s, n) => document.querySelectorAll(s + ' .nb-chip')[n]?.click(), sel, i);
const firstCard = (page, sel) =>
  page.evaluate((s) => {
    const c = document.querySelector(s + ' .nb-card');
    return c ? { cat: c.dataset.category, kind: c.dataset.kind, saved: c.classList.contains('saved'), name: c.querySelector('.nb-name')?.textContent || '' } : null;
  }, sel);
const savedLS = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('act_notices_saved') || '[]'));
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
const scrollToBoard = async (page, sel) => {
  await page.evaluate((s) => document.querySelector(s)?.scrollIntoView({ block: 'start', behavior: 'instant' }), sel);
  // Wait for the Reveal wrapper's opacity transition to settle so screenshots
  // show the finished board rather than a mid-reveal frame.
  await pollUntil(
    page,
    (s) => {
      const rv = document.querySelector(s + ' [data-rv]') || document.querySelector(s);
      return rv && getComputedStyle(rv).opacity === '1' ? true : null;
    },
    sel,
    8000,
  );
};

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
  await page.evaluateOnNewDocument(() => {
    try {
      localStorage.setItem('act_welcomed', '1');
      localStorage.setItem('act_consent', JSON.stringify({ necessary: true, analytics: false, personalization: false }));
    } catch {}
  });
  await page.setViewport({ width: 1440, height: 900 });

  /* ── LOKSEWA FULL BOARD (Nepali-first) ─────────────────────────── */
  console.log('\nNOTICES · LOKSEWA FULL BOARD');
  const B = '.nb-full';
  await page.goto(BASE + '/loksewa', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitBoard(page, B);
  await scrollToBoard(page, '#lk-notices');
  await sleep(400);

  const snap = await page.evaluate((s) => {
    const b = document.querySelector(s);
    return {
      cards: b.querySelectorAll('.nb-card').length,
      chips: [...b.querySelectorAll('.nb-chip')].map((c) => +c.querySelector('b')?.textContent),
      live: b.querySelectorAll('.nb-status.s-live').length,
      down: b.querySelectorAll('.nb-status.s-down').length,
      blocked: b.querySelectorAll('.nb-status.s-blocked').length,
      open: b.querySelectorAll('.nb-status.s-open').length,
      ext: b.querySelectorAll('a.nb-source[href^="http"]').length,
      int: b.querySelectorAll('.nb-source[href^="/"]').length,
      extRel: b.querySelector('a.nb-source[href^="http"]')?.getAttribute('rel') || '',
      count: b.querySelector('.nb-count')?.textContent.trim() || '',
      freshTexts: [...b.querySelectorAll('.nb-fresh')].map((f) => f.textContent.trim()),
      disclosure: b.querySelector('.nb-disclosure')?.textContent || '',
      livenote: !!b.querySelector('.nb-livenote'),
      livetag: !!b.querySelector('.nb-live-tag'),
      countline: b.querySelector('.nb-count-line')?.textContent || '',
    };
  }, B);
  check('loksewa board renders 35 notices', snap.cards === 35, 'got ' + snap.cards);
  check('five chips (all + government/sansthan/bank/exam)', snap.chips.length === 5, JSON.stringify(snap.chips));
  check('chip counts 35/5/8/20/2', JSON.stringify(snap.chips) === JSON.stringify([35, 5, 8, 20, 2]), JSON.stringify(snap.chips));
  check(`${lkUp} answering portals badge OFFICIAL PORTAL`, snap.live === lkUp, 'got ' + snap.live);
  check(`${lkDown} dead portals badge NO RESPONSE, not verified`, snap.down === lkDown, 'got ' + snap.down);
  check(`${lkBlocked} WAF-challenged portals badge BOT CHECK, not verified`, snap.blocked === lkBlocked, 'got ' + snap.blocked);
  check('every source portal is accounted for', snap.live + snap.down + snap.blocked === 33, `${snap.live}+${snap.down}+${snap.blocked}`);
  check('no portal row claims a curation date was a verification', !snap.freshTexts.some((t) => /प्रमाणित/.test(t)), JSON.stringify(snap.freshTexts.slice(0, 3)));
  check('2 OPEN badges (ACTTOLOG-owned notices)', snap.open === 2, 'got ' + snap.open);
  check('33 external official-source links', snap.ext === 33, 'got ' + snap.ext);
  check('2 internal source links', snap.int === 2, 'got ' + snap.int);
  check('external links rel=noopener', /noopener/.test(snap.extRel), snap.extRel);
  check('live countdown on dated notice', /\d+d \d{2}h \d{2}m/.test(snap.count), snap.count);
  check(
    'source freshness matches the measured check date',
    snap.freshTexts.some((t) => t.includes(EXPECT_FRESH)),
    `want "${EXPECT_FRESH}" got ${JSON.stringify(snap.freshTexts.slice(0, 4))}`,
  );
  check('honesty disclosure: not an automated feed', snap.disclosure.length > 40 && /फिड होइन/.test(snap.disclosure), snap.disclosure.slice(0, 60));
  check('live-note present', snap.livenote);
  check('LIVE tag present', snap.livetag);
  check('count line shows 35', /35/.test(snap.countline), snap.countline);
  check('board desktop fits', !(await overflow(page)));
  await page.screenshot({ path: OUT + '/notice-loksewa.png' });

  // urgency sort surfaces the dated ACTTOLOG notice first
  const uf = await firstCard(page, B);
  check('urgent sort surfaces dated notice first', uf && uf.cat === 'exam' && uf.kind === 'notice', JSON.stringify(uf));

  // search (matches English fields even on the Nepali board)
  await setVal(page, B + ' .nb-search input', 'rastra');
  await sleep(300);
  const sf = await firstCard(page, B);
  check('search "rastra" filters to one bank notice', (await cards(page, B)) === 1 && sf && sf.cat === 'bank', JSON.stringify(sf));
  await setVal(page, B + ' .nb-search input', '');
  await sleep(250);
  check('clearing search restores 35', (await cards(page, B)) === 35);

  // category chips (index order: all, government, sansthan, bank, exam)
  await clickChip(page, B, 3);
  await sleep(250);
  const bankAll = await page.evaluate((s) => [...document.querySelectorAll(s + ' .nb-card')].every((c) => c.dataset.category === 'bank'), B);
  check('bank chip filters to 20 bank notices', (await cards(page, B)) === 20 && bankAll, 'got ' + (await cards(page, B)));
  await page.screenshot({ path: OUT + '/notice-loksewa-bank.png' });
  await clickChip(page, B, 1);
  await sleep(220);
  check('government chip filters to 5', (await cards(page, B)) === 5);
  await clickChip(page, B, 2);
  await sleep(220);
  check('sansthan chip filters to 8', (await cards(page, B)) === 8);
  await clickChip(page, B, 4);
  await sleep(220);
  check('exam chip filters to 2', (await cards(page, B)) === 2);
  await clickChip(page, B, 0);
  await sleep(220);
  check('all chip restores 35', (await cards(page, B)) === 35);

  // A–Z sort orders by English title (lk-adbl "Agriculture Development Bank" first)
  await setVal(page, B + ' .nb-sort', 'org');
  await sleep(250);
  const of = await firstCard(page, B);
  check('A–Z sort puts Agriculture Development Bank first', of && of.cat === 'bank' && /कृषि विकास बैंक/.test(of.name), JSON.stringify(of));
  await setVal(page, B + ' .nb-sort', 'urgent');
  await sleep(250);

  // save + localStorage persistence
  await page.evaluate((s) => document.querySelector(s + ' .nb-save')?.click(), B);
  await sleep(250);
  const ls1 = await savedLS(page);
  const sc1 = await firstCard(page, B);
  const savedCount1 = await page.evaluate((s) => document.querySelector(s + ' .nb-savedtoggle b')?.textContent, B);
  check('save writes one id to localStorage', ls1.length === 1, JSON.stringify(ls1));
  check('saved card is marked', sc1 && sc1.saved, JSON.stringify(sc1));
  check('saved counter shows 1', savedCount1 === '1', savedCount1);
  await page.evaluate((s) => document.querySelector(s + ' .nb-savedtoggle')?.click(), B);
  await sleep(250);
  check('saved-only filter shows 1', (await cards(page, B)) === 1);
  await page.evaluate((s) => document.querySelector(s + ' .nb-savedtoggle')?.click(), B);
  await sleep(250);
  check('saved-only off restores 35', (await cards(page, B)) === 35);
  // reload → saved set restored from localStorage. The child clocks mount before
  // the board's own restore effect, so wait for the counter itself, not the board.
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitBoard(page, B);
  await pollUntil(page, (s) => {
    const b = document.querySelector(s + ' .nb-savedtoggle b');
    return b && b.textContent.trim() === '1' ? true : null;
  }, B);
  const savedCount2 = await page.evaluate((s) => document.querySelector(s + ' .nb-savedtoggle b')?.textContent, B);
  check('saved persists across reload', savedCount2 === '1', savedCount2);
  await page.evaluate((s) => document.querySelector(s + ' .nb-card.saved .nb-save')?.click(), B);
  await pollUntil(page, () => (JSON.parse(localStorage.getItem('act_notices_saved') || '[]').length === 0 ? true : null));
  check('unsave clears localStorage', (await savedLS(page)).length === 0, JSON.stringify(await savedLS(page)));

  // detail expand / collapse
  const det0 = await page.evaluate((s) => document.querySelectorAll(s + ' .nb-detail').length, B);
  await page.evaluate((s) => document.querySelector(s + ' .nb-more')?.click(), B);
  await sleep(250);
  const det1 = await page.evaluate((s) => document.querySelectorAll(s + ' .nb-detail').length, B);
  check('detail expands', det1 === det0 + 1, `${det0} -> ${det1}`);
  await page.evaluate((s) => document.querySelector(s + ' .nb-more')?.click(), B);
  await sleep(250);
  const det2 = await page.evaluate((s) => document.querySelectorAll(s + ' .nb-detail').length, B);
  check('detail collapses', det2 === det0, `${det1} -> ${det2}`);

  /* ── EVERY DIVISION BOARD ──────────────────────────────────────── */
  console.log('\nNOTICES · DIVISION BOARDS');
  const divisions = [
    ['/research', 'research', 7],
    ['/entertainment', 'entertainment', 3],
    ['/academy', 'academy', 9],
    ['/games', 'games', 2],
    ['/darkroom', 'darkroom', 4],
    ['/nepal', 'nepal', 6],
  ];
  for (const [path, scope, count] of divisions) {
    await page.goto(BASE + path, { waitUntil: 'domcontentloaded', timeout: 60000 });
    const ok = await waitBoard(page, '.nb-section');
    const d = await page.evaluate(() => {
      const b = document.querySelector('.nb-section');
      return {
        cards: b ? b.querySelectorAll('.nb-card').length : 0,
        livetag: !!b?.querySelector('.nb-live-tag'),
        disclosure: (b?.querySelector('.nb-disclosure')?.textContent || '').length,
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      };
    });
    check(`${scope} board hydrates`, !!ok);
    check(`${scope} board renders ${count} notices`, d.cards === count, 'got ' + d.cards);
    check(`${scope} board has LIVE tag`, d.livetag);
    check(`${scope} board carries disclosure`, d.disclosure > 40, 'len ' + d.disclosure);
    check(`${scope} page fits`, !d.overflow);
    if (scope === 'research') {
      await scrollToBoard(page, '.nb-section');
      await sleep(300);
      await page.screenshot({ path: OUT + '/notice-research.png' });
    }
  }

  /* ── MOBILE ────────────────────────────────────────────────────── */
  console.log('\nNOTICES · MOBILE');
  await page.setViewport({ width: 390, height: 844 });
  await page.goto(BASE + '/loksewa', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitBoard(page, B);
  await scrollToBoard(page, '#lk-notices');
  await sleep(400);
  check('mobile 390 board fits', !(await overflow(page)));
  const mSearch = await page.evaluate((s) => !!document.querySelector(s + ' .nb-search input'), B);
  check('mobile toolbar search reachable', mSearch);
  await setVal(page, B + ' .nb-search input', 'rastra');
  await sleep(300);
  check('mobile search filters to 1', (await cards(page, B)) === 1);
  await setVal(page, B + ' .nb-search input', '');
  await sleep(250);
  await page.screenshot({ path: OUT + '/notice-mobile.png' });
  await page.setViewport({ width: 320, height: 700 });
  await sleep(300);
  check('mobile 320 board fits', !(await overflow(page)));

  /* ── ERRORS ────────────────────────────────────────────────────── */
  console.log('\nNOTICES · RUNTIME');
  check('no console/page errors', errs.length === 0, errs.slice(0, 6).join(' | '));

  await browser.close();
  console.log(`\nNOTICE QA: ${pass} passed, ${fails.length} failed`);
  if (fails.length) {
    console.log('FAILED:\n - ' + fails.join('\n - '));
    process.exit(1);
  }
})().catch((e) => {
  console.error('NOTICE QA crashed:', e);
  process.exit(2);
});