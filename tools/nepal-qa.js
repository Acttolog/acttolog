/**
 * Nepal guide QA — headless Chrome (software WebGL).
 *
 * Design rule: every assertion must be one that plain prerendered HTML could
 * NOT satisfy by accident. An earlier revision of this file passed "region
 * filter applies" by matching text that was already in the static markup, and
 * reported a green board while nothing on the page was actually interactive.
 * So step 1 is now a hard hydration gate; if it fails, the run aborts.
 *
 * Usage: node tools/nepal-qa.js [base-url]      (default http://127.0.0.1:3222)
 */
const puppeteer = require('puppeteer');
const fs = require('fs');

const BASE = process.argv[2] || 'http://127.0.0.1:3222';
const OUT = process.cwd() + '/qa-shots';
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const REQUIRED_TEXT = [
  'Sagarmatha', 'Kathmandu Valley', 'Chitwan', 'Dashain', 'Lumbini',
  'Lo Manthang', 'Poon Hill', 'Restricted Area Permit', 'dal bhat',
  'one-horned rhino', 'UTC+05:45', 'Namaste', '8,848.86', 'Gharial',
  'barasingha', 'Manakamana', 'Phoksundo', 'Tengboche', 'Koshi Tappu',
  'Wikimedia Commons', 'CC BY-SA', 'photographed',
];

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + String(detail).slice(0, 110) : ''}`);
  return ok;
}

async function main() {
  const browser = await puppeteer.launch({
    headless: 'shell',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu-sandbox',
      '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'],
  });

  const errors = [];
  const newPage = async (w, h, mobile) => {
    const page = await browser.newPage();
    await page.setViewport({ width: w, height: h, deviceScaleFactor: 1, isMobile: !!mobile, hasTouch: !!mobile });
    page.on('pageerror', (e) => errors.push({ t: 'pageerror', x: String(e).slice(0, 220) }));
    page.on('console', (m) => { if (m.type() === 'error') errors.push({ t: 'console', x: m.text().slice(0, 220) }); });
    page.on('requestfailed', (r) => errors.push({ t: 'requestfailed', x: r.url().slice(0, 150) }));
    return page;
  };

  const page = await newPage(1440, 900, false);
  const resp = await page.goto(`${BASE}/nepal`, { waitUntil: 'networkidle2', timeout: 90000 });
  check('HTTP 200', resp.status() === 200, String(resp.status()));
  await sleep(1500);

  /* ── 1. HYDRATION GATE (must pass before anything else means anything) ── */
  const GATE_TOKEN = 'zzq-nomatch-token';
  const before = await page.$eval('.np-flt-count', (e) => e.innerText).catch(() => '(absent)');
  await page.type('.np-flt-search input', GATE_TOKEN, { delay: 12 }).catch(() => {});
  await sleep(700);
  const during = await page.$eval('.np-flt-count', (e) => e.innerText).catch(() => '(absent)');
  const hydrated = check('hydration gate: search rewrites the count', /(^|\D)0 \/ 32/.test(during),
    `before "${before.trim()}" → after "${during.trim()}"`);
  await page.evaluate((sel) => {
    const i = document.querySelector(sel);
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(i, ''); i.dispatchEvent(new Event('input', { bubbles: true }));
  }, '.np-flt-search input');
  await sleep(500);
  if (!hydrated) {
    console.log('\nABORT: the page is not interactive, so every later assertion would be measuring static HTML.\n');
    console.log('ERRORS:', errors.slice(0, 10));
    await browser.close();
    process.exit(1);
  }

  /* ── 2. content actually present in the DOM ───────────────────────────── */
  /* textContent, not innerText: hidden tab panels still count as shipped copy */
  const bodyText = await page.evaluate(() => document.body.textContent);
  const missing = REQUIRED_TEXT.filter((t) => !bodyText.toLowerCase().includes(t.toLowerCase()));
  check('all required copy rendered', missing.length === 0, missing.length ? 'missing: ' + missing.join(', ') : `${REQUIRED_TEXT.length} terms`);

  const inv = await page.evaluate(() => ({
    sections: document.querySelectorAll('section[id]').length,
    placeCards: document.querySelectorAll('[id^="place-"]').length,
    zoneBtns: document.querySelectorAll('.np-zone-btn').length,
    fest: document.querySelectorAll('.np-fest-card').length,
    trek: document.querySelectorAll('.np-trek').length,
    season: document.querySelectorAll('.np-season').length,
    wild: document.querySelectorAll('.np-wild-card').length,
    food: document.querySelectorAll('.np-food-card').length,
    cult: document.querySelectorAll('.np-cult-card').length,
    clips: document.querySelectorAll('.np-clip').length,
    permits: document.querySelectorAll('.np-gt-card').length,
    etiquette: document.querySelectorAll('.np-gt-li').length,
    tabpanels: document.querySelectorAll('[role="tabpanel"]').length,
    hiddenPanels: document.querySelectorAll('[role="tabpanel"][hidden]').length,
    galleryFigs: document.querySelectorAll('.np-gal-fig').length,
    creditLinks: document.querySelectorAll('.np-gal-credit a[rel*="license"]').length,
    realPhotos: Array.from(document.querySelectorAll('.np-gal-img')).filter((i) => /\/media\/nepal\//.test(i.getAttribute('src') || '')).length,
    srcsetPhotos: document.querySelectorAll('.np-gal-media source[srcset], .np-card-media source[srcset], .np-food-media source[srcset]').length,
    brokenImgs: Array.from(document.images).filter((i) => i.complete && i.naturalWidth === 0).length,
    // Leaflet creates its own <img> tiles; they are not ours to lazy-load.
    ourTotal: Array.from(document.images).filter((i) => !i.closest('.leaflet-container')).length,
    ourLazy: Array.from(document.images).filter((i) => !i.closest('.leaflet-container') && i.loading === 'lazy').length,
  }));
  const ourTotal = inv.ourTotal;
  console.log('\n  inventory:', JSON.stringify(inv));

  check('12 sections', inv.sections >= 12, `${inv.sections}`);
  check('all 32 place cards in DOM', inv.placeCards === 32, `${inv.placeCards}`);
  check('12 region buttons', inv.zoneBtns === 12, `${inv.zoneBtns}`);
  check('10 festivals', inv.fest === 10, `${inv.fest}`);
  check('8 treks', inv.trek === 8, `${inv.trek}`);
  check('4 seasons', inv.season === 4, `${inv.season}`);
  check('8 wildlife cards', inv.wild === 8, `${inv.wild}`);
  check('9 cuisine cards', inv.food === 9, `${inv.food}`);
  check('8 culture cards', inv.cult === 8, `${inv.cult}`);
  check('4 video clips', inv.clips === 4, `${inv.clips}`);
  check('all 4 guideline panels in DOM (not stripped)', inv.tabpanels === 4, `${inv.tabpanels}`);
  check('inactive panels hidden, not removed', inv.hiddenPanels === 3, `${inv.hiddenPanels} hidden`);
  check('10 etiquette rules present', inv.etiquette === 10, `${inv.etiquette}`);
  check('no broken images', inv.brokenImgs === 0, `${inv.brokenImgs} broken`);
  check('our images lazy-loaded', inv.ourLazy >= ourTotal - 2, `${inv.ourLazy}/${ourTotal} (hero is eager on purpose)`);
  check('gallery renders real photographs', inv.galleryFigs >= 20 && inv.realPhotos >= 20,
    `${inv.galleryFigs} figures, ${inv.realPhotos} from /media/nepal`);
  check('licence credits rendered per photo', inv.creditLinks >= 20, `${inv.creditLinks} rel=license links`);
  check('responsive srcset advertised', inv.srcsetPhotos >= 30, `${inv.srcsetPhotos} <source> elements with srcset`);

  /* ── 3. real interactions (only meaningful post-gate) ─────────────────── */
  await page.waitForSelector('.np-zone-detail', { timeout: 15000 });
  // DOM-level click: the aside sits in a scroll box beside a Leaflet overlay,
  // and Puppeteer's coordinate click races the hotspot layer re-build. The
  // point under test is that the React handler fires, not the mouse path.
  await page.evaluate(() => document.querySelectorAll('.np-zone-btn')[7].click());
  await page.waitForFunction(
    () => /mustang/i.test((document.querySelector('.np-zone-detail') || {}).textContent || ''),
    { timeout: 15000 },
  );
  const zoneTxt = await page.$eval('.np-zone-detail', (e) => e.textContent);
  check('region click changes panel', /mustang/i.test(zoneTxt), zoneTxt.trim().slice(0, 60));

  await page.evaluate(() => document.querySelectorAll('.np-gt-tab')[2].click());
  await sleep(500);
  const safetyVisible = await page.$eval('#np-panel-safety', (e) => !e.hidden && e.offsetHeight > 0);
  const permitsHidden = await page.$eval('#np-panel-permits', (e) => e.hidden);
  check('guidelines tab switches', safetyVisible && permitsHidden, `safety shown=${safetyVisible} permits hidden=${permitsHidden}`);

  await page.type('.np-flt-search input', 'rhino', { delay: 12 });
  await sleep(700);
  const n = Number((await page.$eval('.np-flt-count', (e) => e.innerText)).match(/(\d+)/)[1]);
  const visibleCards = await page.$$eval('.np-grid .np-card', (els) => els.length);
  check('search narrows to matching places', n >= 1 && n < 32 && visibleCards === n, `${n} hits, ${visibleCards} cards rendered`);
  await page.evaluate(() => {
    const i = document.querySelector('.np-flt-search input');
    const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    s.call(i, ''); i.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await sleep(500);

  /* save → localStorage (works for guests, syncs server-side once auth has a backend) */
  await page.evaluate(() => { const k = Object.keys(localStorage).filter((x) => x.startsWith('act_saved_')); k.forEach((x) => localStorage.removeItem(x)); });
  await page.evaluate(() => document.querySelector('#places .np-grid .np-card .np-card-acts button').click());
  await sleep(900);
  const saved = await page.evaluate(() => Object.keys(localStorage)
    .filter((k) => k.startsWith('act_saved_'))
    .map((k) => JSON.parse(localStorage[k] || '[]')).flat());
  check('save writes to the My ACTTOLOG store', saved.length === 1 && saved[0].kind === 'place', JSON.stringify(saved[0] || null));

  /* ── 4. map boot (CDN dependency, reported honestly either way) ───────── */
  await page.evaluate(() => document.querySelector('#regions').scrollIntoView());
  await sleep(6000);
  const map = await page.evaluate(() => ({
    container: document.querySelectorAll('.leaflet-container').length,
    tiles: document.querySelectorAll('.leaflet-tile-loaded').length,
    zones: document.querySelectorAll('.np-zone').length,
    failedPanel: Boolean(document.querySelector('.np-map-fail')),
    degraded: /HOTSPOTS UNAVAILABLE/.test(document.body.textContent),
  }));
  const mapUp = map.container === 1 && map.tiles > 0 && map.zones === 12 && !map.degraded;
  check('Leaflet map booted with live tiles AND 12 hotspots', mapUp, JSON.stringify(map));
  if (!mapUp) console.log('  NOTE: zones=0 with a booted map means the hotspot layer threw and degraded silently — check the component, not the CDN.');

  /* ── 5. screenshots ───────────────────────────────────────────────────── */
  const shots = [
    ['top', 0], ['#regions', 1], ['#places', 2], ['#festivals', 3],
    ['#treks', 4], ['#guidelines', 5], ['#reel', 6],
  ];
  for (const [sel, i] of shots) {
    if (i === 0) await page.evaluate(() => window.scrollTo(0, 0));
    else await page.evaluate((s) => document.querySelector(s)?.scrollIntoView(), sel);
    await sleep(1400);
    await page.screenshot({ path: `${OUT}/nepal-d${i}.png` });
  }

  /* ── 6. mobile ────────────────────────────────────────────────────────── */
  const m = await newPage(390, 844, true);
  const mr = await m.goto(`${BASE}/nepal`, { waitUntil: 'networkidle2', timeout: 90000 });
  // 304 is a legitimate success here: GitHub Pages caches the prerendered HTML,
  // so a second request for the same URL in one run returns Not Modified.
  check('mobile HTTP ok', [200, 304].includes(mr.status()), String(mr.status()));
  await sleep(2000);
  const mo = await m.evaluate(() => ({
    docW: document.documentElement.scrollWidth, winW: window.innerWidth,
    navBtns: document.querySelectorAll('.np-zone-btn').length,
    mapH: (document.querySelector('.np-map-wrap') || {}).clientHeight || 0,
    offscreen: Array.from(document.querySelectorAll('section[id]')).filter((s) => s.getBoundingClientRect().width > window.innerWidth + 2).map((s) => s.id),
  }));
  check('no horizontal overflow on mobile', mo.docW <= mo.winW + 2, `doc ${mo.docW} vs ${mo.winW}`);
  check('no oversized section on mobile', mo.offscreen.length === 0, mo.offscreen.join(','));
  check('map panel has height on mobile', mo.mapH >= 300, `${mo.mapH}px`);
  await m.screenshot({ path: `${OUT}/nepal-m0.png` });
  await m.evaluate(() => document.querySelector('#regions').scrollIntoView());
  await sleep(3500);
  await m.screenshot({ path: `${OUT}/nepal-m1.png` });
  await m.evaluate(() => document.querySelector('#guidelines').scrollIntoView());
  await sleep(1200);
  await m.screenshot({ path: `${OUT}/nepal-m2.png` });

  /* ── 7. homepage promo band ───────────────────────────────────────────── */
  const home = await newPage(1440, 900, false);
  await home.goto(`${BASE}/`, { waitUntil: 'networkidle2', timeout: 90000 });
  await sleep(2500);
  const promo = await home.evaluate(() => {
    const el = document.querySelector('#nepal-promo');
    if (!el) return null;
    return {
      heading: (el.querySelector('h2') || {}).textContent || '',
      linksNepal: Array.from(el.querySelectorAll('a')).filter((a) => (a.getAttribute('href') || '').startsWith('/nepal')).length,
      facts: el.querySelectorAll('.npromo-fact').length,
      chips: el.querySelectorAll('.npromo-chip').length,
    };
  });
  if (promo) {
    check('homepage Nepal promo band present', /Nepal/i.test(promo.heading), promo.heading.trim().slice(0, 70));
    check('promo links into /nepal', promo.linksNepal >= 3, `${promo.linksNepal} links`);
    check('promo shows stat facts', promo.facts >= 4, `${promo.facts}`);
    check('promo lists UNESCO entries', promo.chips >= 3, `${promo.chips} chips`);
    await home.evaluate(() => document.querySelector('#nepal-promo').scrollIntoView());
    await sleep(1200);
    await home.screenshot({ path: `${OUT}/home-nepal-promo.png` });
  } else {
    check('homepage Nepal promo band present', false, 'no #nepal-promo element on /');
  }

  /* ── 8. article saving feeds the same My ACTTOLOG bucket ──────────────── */
  const postSlug = await home.evaluate(() => {
    const a = document.querySelector('a[href^="/blog/"]');
    return a ? a.getAttribute('href') : null;
  });
  if (postSlug) {
    const bp = await newPage(1440, 900, false);
    await bp.goto(`${BASE}${postSlug}`, { waitUntil: 'networkidle2', timeout: 90000 });
    await sleep(2000);
    const hasSave = await bp.evaluate(() => Array.from(document.querySelectorAll('button'))
      .some((b) => /SAVE|SAVED/i.test(b.textContent || '')));
    check('article offers Save to My ACTTOLOG', hasSave, postSlug);
    if (hasSave) {
      await bp.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button'))
          .find((b) => (b.textContent || '').trim().toUpperCase().startsWith('SAVE'));
        if (btn) btn.click();
      });
      await sleep(800);
      const kinds = await bp.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('act_saved_'))
        .map((k) => JSON.parse(localStorage[k] || '[]')).flat().map((x) => x.kind));
      check('saving an article stores kind "post"', kinds.includes('post'), JSON.stringify(kinds));
    }
    await bp.close();
  } else {
    console.log('  (no blog link on home — article checks skipped)');
  }

  await browser.close();

  const SITE_ROUTES = /^https?:\/\/127\.0\.0\.1:3\d{3}\/(mypage|nepal|explore|blog|offers|about|contact|ai|research|entertainment|academy|games|darkroom|search|my(\/.*)?|admin(\/.*)?|sitemap\.xml|robots\.txt|brand(\/.*)?|media(\/.*)?|textures(\/.*)?)?$/;
  // A crude static file server cannot answer Next's RSC prefetch (?_rsc=…) with
  // the right content type, so those abort. GitHub Pages serves the .txt
  // segments and does not have this problem — do not count them as defects.
  const TILE_NOISE = /tile\.openstreetmap\.org|arcgisonline|unpkg\.com/i;
  const isNoise = (e) => e.t === 'requestfailed'
    ? (SITE_ROUTES.test(e.x) || TILE_NOISE.test(e.x))
    : (/Failed to load resource/i.test(e.x) || /favicon|Download the React|DevTools|hmr|WebSocket/i.test(e.x));
  const suppressed = errors.filter(isNoise).length;
  const real = errors.filter((e) => !isNoise(e));
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`CHECKS ${results.filter((r) => r.ok).length}/${results.length} passed`);
  console.log(`GENUINE JS/NETWORK ERRORS ${real.length}`);
  real.slice(0, 15).forEach((e) => console.log(`  [${e.t}] ${e.x}`));
  console.log(`(suppressed ${suppressed} RSC-prefetch / tile-abort notices — harness artifact, not a defect)`);
  process.exit(results.every((r) => r.ok) && real.length === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error('HARNESS ERROR', e);
  console.log(`\nCHECKS so far: ${results.filter((r) => r.ok).length}/${results.length} passed`);
  results.filter((r) => !r.ok).forEach((r) => console.log('  FAILED: ' + r.name + ' — ' + r.detail));
  process.exit(2);
});
