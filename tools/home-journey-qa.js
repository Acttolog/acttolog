#!/usr/bin/env node
/* ACTTOLOG immersive homepage journey QA. Usage: node tools/home-journey-qa.js [base] */
const puppeteer = require('puppeteer');
const BASE = process.argv[2] || 'http://127.0.0.1:3120';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const count = (page, selector) => page.$$eval(selector, (els) => els.length);
const visible = (page, selector) => page.$eval(selector, (el) => { const s = getComputedStyle(el); const r = el.getBoundingClientRect(); return s.visibility !== 'hidden' && s.display !== 'none' && r.width > 0 && r.height > 0; }).catch(() => false);
let passed = 0;
const failures = [];
const check = (ok, name, detail = '') => {
  if (ok) { passed++; console.log(`PASS  ${name}${detail ? ' — ' + detail : ''}`); }
  else { failures.push(`${name}${detail ? ' — ' + detail : ''}`); console.log(`FAIL  ${name}${detail ? ' — ' + detail : ''}`); }
};

async function open(browser, options = {}) {
  const page = await browser.newPage();
  await page.setViewport({ width: options.width || 1440, height: options.height || 900, isMobile: !!options.touch, hasTouch: !!options.touch });
  const cdp = await page.createCDPSession();
  await cdp.send('Emulation.setEmulatedMedia', { features: [
    { name: 'prefers-reduced-motion', value: options.reduced ? 'reduce' : 'no-preference' },
    { name: 'pointer', value: options.touch ? 'coarse' : 'fine' },
    { name: 'hover', value: options.touch ? 'none' : 'hover' },
  ] });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 180)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 180)); });
  await page.evaluateOnNewDocument(() => {
    try {
      localStorage.setItem('act_consent', JSON.stringify({ necessary: true, analytics: false, personalization: false }));
      localStorage.setItem('act_welcomed', '1');
    } catch {}
  });
  return { page, cdp, errors };
}

async function scrollTo(page, y) {
  await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y);
  await sleep(1500);
}

(async () => {
  const browser = await puppeteer.launch({ headless: 'shell', args: ['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
  const desktop = await open(browser);
  const p = desktop.page;
  await p.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await p.waitForFunction(() => !!document.querySelector('.htitle'), { timeout: 60000, polling: 300 });
  await sleep(1800);

  check(await p.$eval('#hero', (el) => Math.round(window.scrollY) === 0), 'lands on Earth hero');
  check(await count(p, '.hero-copy, .heroin') > 0, 'hero semantic copy exists');
  check(await count(p, '.portal-overlay') === 1 && await count(p, '.atrium-overlay') === 1, 'one portal and one atrium overlay');
  check(await count(p, '.deck, .dsc, .hindex') === 0, 'old duplicate deck/descent/index removed from homepage');

  await scrollTo(p, 1700);
  let phase = await p.$eval('#hero', (el) => el.dataset.phase);
  check(phase === 'approach' || phase === 'doors', 'scroll reaches portal phase', phase);
  check(await p.$eval('.portal-overlay', (el) => Number(getComputedStyle(el).opacity) > 0.5), 'portal copy becomes visible');

  await scrollTo(p, 2050);
  phase = await p.$eval('#hero', (el) => el.dataset.phase);
  check(phase === 'doors', 'scroll reaches door phase', phase);

  await scrollTo(p, 2500);
  await p.waitForFunction(() => Number(getComputedStyle(document.querySelector('.atrium-overlay')).opacity) > 0.9, { timeout: 12000, polling: 250 });
  phase = await p.$eval('#hero', (el) => el.dataset.phase);
  check(phase === 'atrium', 'scroll reaches atrium phase', phase);
  check(await p.$eval('.atrium-overlay', (el) => Number(getComputedStyle(el).opacity) > 0.9), 'atrium welcome becomes visible');

  await p.evaluate(() => document.querySelector('#atrium')?.scrollIntoView({ block: 'start', behavior: 'instant' }));
  await sleep(900);
  check(await visible(p, '#atrium'), 'dashboard is reachable by direct anchor');
  const metrics = await p.$$eval('.atr-metric b', (els) => els.map((el) => el.textContent.trim()));
  check(metrics.length === 6 && metrics.every((n) => Number(n.replace(/,/g, '')) > 0), 'catalogue metrics show real nonzero counts', metrics.join(','));
  check(await count(p, '.world-portal') === 5, 'five canonical division portals');
  check(await count(p, '.fg-card') === 6, 'featured direct-play games preserved');
  check(await count(p, '.founder') === 1 && /one person with one idea/i.test(await p.$eval('.founder', (el) => el.innerText)), 'approved founder story present');
  check(await p.$eval('.hclose-marq', (el) => !el.innerText.includes('/academy') && !el.innerText.includes('/darkroom')), 'footer marquee uses human labels, not raw routes');

  await p.keyboard.down('Control'); await p.keyboard.press('k'); await p.keyboard.up('Control');
  await sleep(400);
  check(await visible(p, '.mbd'), 'global search opens with Ctrl+K');
  await p.keyboard.press('Escape');
  await sleep(250);
  check(!(await visible(p, '.mbd')), 'global search closes with Escape');
  check(desktop.errors.length === 0, 'desktop journey has zero runtime errors', desktop.errors.slice(0, 2).join(' | '));
  await p.close();

  for (const width of [390, 320]) {
    const mobile = await open(browser, { width, height: width === 320 ? 568 : 844, touch: true });
    const mp = mobile.page;
    await mp.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 90000 });
    await mp.waitForFunction(() => !!document.querySelector('.htitle'), { timeout: 60000, polling: 300 });
    await sleep(1200);
    const overflow = await mp.$eval('#hero', (el) => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    check(overflow <= 0, `mobile ${width}: no horizontal overflow`, `over=${overflow}`);
    check(await visible(mp, '.mobile-cmd'), `mobile ${width}: bottom command navigation visible`);
    await mp.evaluate(() => document.querySelector('#atrium')?.scrollIntoView({ block: 'start', behavior: 'instant' }));
    await sleep(700);
    check(await visible(mp, '.atr-shell'), `mobile ${width}: dashboard reachable`);
    const shellOverflow = await mp.$eval('.atr-shell', (el) => el.scrollWidth - el.clientWidth);
    check(shellOverflow <= 1, `mobile ${width}: dashboard has no internal overflow`, `over=${shellOverflow}`);
    check(mobile.errors.length === 0, `mobile ${width}: zero runtime errors`, mobile.errors.slice(0, 2).join(' | '));
    await mp.close();
  }

  const reduced = await open(browser, { reduced: true });
  const rp = reduced.page;
  await rp.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await rp.waitForFunction(() => !!document.querySelector('.htitle'), { timeout: 60000, polling: 300 });
  await sleep(900);
  check(await rp.$eval('#hero', (el) => el.dataset.phase === 'atrium'), 'reduced motion opens directly into atrium');
  check(await visible(rp, '#atrium'), 'reduced motion keeps dashboard accessible');
  check(reduced.errors.length === 0, 'reduced-motion journey has zero runtime errors');
  await rp.close();

  const fallbackBrowser = await puppeteer.launch({ headless: 'shell', args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-webgl', '--disable-webgl2'] });
  const fallback = await open(fallbackBrowser);
  const fp = fallback.page;
  await fp.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await fp.waitForFunction(() => !!document.querySelector('.htitle'), { timeout: 60000, polling: 300 });
  await sleep(900);
  check(await count(fp, '#atrium') === 1, 'WebGL-off fallback keeps semantic dashboard');
  check(await count(fp, 'canvas') === 0, 'WebGL-off fallback does not mount a blank canvas');
  check(fallback.errors.length === 0, 'WebGL-off fallback has zero runtime errors');
  await fp.close();
  await fallbackBrowser.close();

  await browser.close();
  console.log(`\nJOURNEY ${passed}/${passed + failures.length} passed`);
  if (failures.length) { console.log('FAILURES\n- ' + failures.join('\n- ')); process.exit(1); }
})().catch((e) => { console.error('HARNESS ERROR', e); console.log(`\nJOURNEY ${passed}/${passed + failures.length} passed`); process.exit(2); });
