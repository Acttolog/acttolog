/**
 * Mission-control deck QA — run against the harvested mirror.
 *   node tools/serve-static.js .pages-site 8140
 *   DECK_BASE=http://127.0.0.1:8140 node tools/deck-qa.js
 */
const puppeteer = require('puppeteer');
const fs = require('fs');

const BASE = process.env.DECK_BASE || 'http://127.0.0.1:8140';
const OUT = process.env.DECK_OUT || 'C:/Users/acttolog/AppData/Local/arcadeqa/deck';
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
  page.on('console', (m) => {
    if (m.type() === 'error' && !/WebGL|THREE|favicon/i.test(m.text())) errs.push(m.text().slice(0, 160));
  });
  page.on('pageerror', (e) => {
    if (!/WebGL|THREE/i.test(e.message)) errs.push(e.message.slice(0, 160));
  });
  await page.evaluateOnNewDocument(() => {
    try {
      localStorage.setItem('act_welcomed', '1');
      localStorage.setItem('act_consent', JSON.stringify({ necessary: true, analytics: false, personalization: false }));
    } catch {}
  });
  await page.setViewport({ width: 1440, height: 900 });

  console.log('\nDECK · EN');
  await page.goto(BASE + '/', { waitUntil: 'networkidle2', timeout: 120000 });
  await sleep(1200);
  await page.evaluate(() => document.querySelector('#deck')?.scrollIntoView({ block: 'start', behavior: 'instant' }));
  // A 2px nudge forces IntersectionObserver to re-sample: a scroll that lands
  // before hydration can otherwise leave the count-up armed but never fired.
  await page.evaluate(() => window.scrollBy(0, 2));
  await page
    .waitForFunction(
      () => {
        const s = [...document.querySelectorAll('.dk-stat b')].map((b) => +b.textContent.replace(/,/g, ''));
        return s.length === 6 && s.every((n) => n > 0);
      },
      { timeout: 8000 },
    )
    .catch(() => {});
  await sleep(300);
  const deck = await page.evaluate(() => ({
    cards: document.querySelectorAll('.deck-card').length,
    clock: document.querySelector('.dk-clock')?.textContent || '',
    date: document.querySelector('.dk-date')?.textContent || '',
    stats: [...document.querySelectorAll('.dk-stat b')].map((b) => +b.textContent.replace(/,/g, '')),
    cadBars: document.querySelectorAll('.dk-cad-bar').length,
    netRows: document.querySelectorAll('.dk-net li').length,
    quick: [...document.querySelectorAll('.dk-tile')].map((a) => ({
      href: a.getAttribute('href'),
      img: a.querySelector('img')?.naturalWidth || 0,
    })),
    feed: document.querySelectorAll('.dk-feed li').length,
    swatches: document.querySelectorAll('.dk-swatch').length,
    price: document.querySelector('.dk-price')?.textContent || '',
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  }));
  check('nine deck cards', deck.cards === 9, 'got ' + deck.cards);
  check('clock shows NPT time', /^\d{2}:\d{2}:\d{2}$/.test(deck.clock), deck.clock);
  check('clock date line', /\d{4}/.test(deck.date), deck.date);
  const c1 = deck.clock;
  await sleep(1600);
  const c2 = await page.evaluate(() => document.querySelector('.dk-clock')?.textContent);
  check('clock ticks', c1 !== c2, `${c1} -> ${c2}`);
  check('six real counters > 0', deck.stats.length === 6 && deck.stats.every((n) => n > 0), JSON.stringify(deck.stats));
  check('six cadence bars', deck.cadBars === 6, 'got ' + deck.cadBars);
  check('division rows online', deck.netRows >= 5, 'got ' + deck.netRows);
  check('six quick-play tiles', deck.quick.length === 6, 'got ' + deck.quick.length);
  check('quick tiles link direct to arcade', deck.quick.every((q) => (q.href || '').startsWith('/arcade/index.html?game=')), JSON.stringify(deck.quick.map((q) => q.href)));
  check('quick thumbs load', deck.quick.every((q) => q.img > 0), JSON.stringify(deck.quick.map((q) => q.img)));
  check('six dispatch rows', deck.feed === 6, 'got ' + deck.feed);
  check('13 theme swatches', deck.swatches === 13, 'got ' + deck.swatches);
  check('offer price in NPR', /^Rs [\d,]+$/.test(deck.price.trim()), deck.price);
  check('deck desktop fits', !deck.overflow);
  await page.screenshot({ path: OUT + '/deck-dark.png' });

  console.log('\nTHEME STUDIO');
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('.dk-swatch')].find((x) => x.getAttribute('aria-label') === 'Holographic Ice');
    b?.click();
  });
  await sleep(400);
  check('holo applies', await page.evaluate(() => document.documentElement.getAttribute('data-theme') === 'holo'));
  await page.screenshot({ path: OUT + '/deck-holo.png' });
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('.dk-swatch')].find((x) => x.getAttribute('aria-label') === 'Titanium Light');
    b?.click();
  });
  await sleep(400);
  check('titanium applies', await page.evaluate(() => document.documentElement.getAttribute('data-theme') === 'titanium'));
  await page.screenshot({ path: OUT + '/deck-titanium.png' });
  await page.reload({ waitUntil: 'networkidle2' });
  await sleep(900);
  check('theme persists across reload (boot script)', await page.evaluate(() => document.documentElement.getAttribute('data-theme') === 'titanium'));
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('.dk-swatch')].find((x) => x.getAttribute('aria-label') === 'Nebula Violet');
    b?.click();
  });
  await sleep(400);
  check('nebula applies', await page.evaluate(() => document.documentElement.getAttribute('data-theme') === 'nebula'));
  await page.evaluate(() => document.querySelector('#deck')?.scrollIntoView({ block: 'start' }));
  await sleep(900);
  await page.screenshot({ path: OUT + '/deck-nebula.png' });
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('.dk-swatch')].find((x) => x.getAttribute('aria-label') === 'Obsidian (default)');
    b?.click();
  });
  await sleep(300);

  console.log('\nDECK · NE');
  await page.goto(BASE + '/ne', { waitUntil: 'networkidle2', timeout: 120000 });
  await sleep(1000);
  const ne = await page.evaluate(() => ({
    kicker: document.querySelector('.deck .kicker')?.textContent || '',
    cards: document.querySelectorAll('.deck-card').length,
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  }));
  check('nepali deck renders', ne.cards === 9 && /मिसन/.test(ne.kicker), JSON.stringify(ne));
  check('ne desktop fits', !ne.overflow);

  console.log('\nMOBILE');
  const m = await browser.newPage();
  m.on('pageerror', (e) => {
    if (!/WebGL|THREE/i.test(e.message)) errs.push('mobile ' + e.message.slice(0, 160));
  });
  await m.evaluateOnNewDocument(() => {
    try {
      localStorage.setItem('act_welcomed', '1');
      localStorage.setItem('act_consent', JSON.stringify({ necessary: true, analytics: false, personalization: false }));
    } catch {}
  });
  await m.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await m.goto(BASE + '/', { waitUntil: 'networkidle2', timeout: 120000 });
  await sleep(1000);
  await m.evaluate(() => document.querySelector('#deck')?.scrollIntoView({ block: 'start' }));
  await sleep(1200);
  check('deck fits 390', await m.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1));
  await m.screenshot({ path: OUT + '/deck-mobile.png', fullPage: false });
  await m.setViewport({ width: 320, height: 700, isMobile: true, hasTouch: true });
  await sleep(500);
  check('deck fits 320', await m.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1));
  await m.close();

  console.log('\nREDUCED MOTION');
  const r = await browser.newPage();
  await r.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await r.setViewport({ width: 1440, height: 900 });
  await r.goto(BASE + '/', { waitUntil: 'networkidle2', timeout: 120000 });
  await sleep(900);
  const rm = await r.evaluate(() => ({
    anim: getComputedStyle(document.querySelector('.deck-card')).animationName,
    visible: getComputedStyle(document.querySelector('.deck-card')).opacity,
  }));
  check('reduced motion disables deck entrance', rm.anim === 'none' && rm.visible === '1', JSON.stringify(rm));
  await r.close();

  check('no console/page errors', errs.length === 0, errs.slice(0, 4).join(' | '));
  console.log('\nRESULT ' + pass + ' passed, ' + fails.length + ' failed');
  if (fails.length) console.log('FAILURES\n- ' + fails.join('\n- '));
  await browser.close();
  process.exit(fails.length ? 1 : 0);
})().catch((e) => {
  console.error('FATAL', e);
  process.exit(1);
});