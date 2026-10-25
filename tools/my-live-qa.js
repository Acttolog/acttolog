/**
 * Live guest-mode QA for My ACTTOLOG: save a search, persistence across reload,
 * recently viewed, and the personalization preference.
 * Usage: node tools/my-live-qa.js [base-url]
 */
const puppeteer = require('puppeteer');
const BASE = process.argv[2] || 'https://acttolog.github.io';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (n, ok, d = '') => { results.push({ n, ok }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`); };

(async () => {
  const b = await puppeteer.launch({ headless: 'shell', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await p.setViewport({ width: 1280, height: 900 });
  await p.evaluateOnNewDocument(() => {
    try { localStorage.setItem('act_consent', JSON.stringify({ necessary: true, analytics: false, personalization: false })); } catch {}
  });

  await p.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(5000);

  // 1. save a search through the real overlay
  let hasInput = false;
  for (let i = 0; i < 12 && !hasInput; i++) {
    await p.keyboard.down('Control'); await p.keyboard.press('KeyK'); await p.keyboard.up('Control');
    await sleep(1200);
    hasInput = await p.evaluate(() => !!document.querySelector('[role="dialog"] input[aria-label]'));
  }
  check('Ctrl+K opens search overlay', hasInput);
  const inputSel = await p.evaluate(() => {
    const el = document.querySelector('[role="dialog"] input[aria-label]');
    if (!el) return null;
    el.setAttribute('data-qa-search', '1');
    return true;
  });
  await p.type('input[data-qa-search="1"]', 'pokhara');
  await sleep(500);
  const btn = await p.evaluateHandle(() => [...document.querySelectorAll('button')].find((e) => e.getAttribute('aria-label') === 'Save this search' && /Save search/i.test(e.textContent)));
  check('Save this search offered', !!(btn && btn.asElement()));
  if (btn && btn.asElement()) await btn.asElement().click();
  await sleep(700);
  const saved = await p.evaluate(() => JSON.parse(localStorage.getItem('act_saved_guest') || '[]'));
  check('search persisted to localStorage', saved.some((s) => s.kind === 'search' && /pokhara/i.test(s.id)), JSON.stringify(saved.map((s) => s.kind + ':' + s.id)));

  // 2. My > Saved shows it, and it survives reload
  await p.goto(BASE + '/my/saved', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(4500);
  const savedText = await p.evaluate(() => document.body.innerText);
  check('My Saved lists the search', /pokhara/i.test(savedText) && /SEARCH/.test(savedText));
  await p.reload({ waitUntil: 'domcontentloaded' });
  await sleep(4500);
  check('saved search survives reload', /pokhara/i.test(await p.evaluate(() => document.body.innerText)));

  // 3. recently viewed
  await p.goto(BASE + '/nepal', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(5000);
  await p.goto(BASE + '/my/recent', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(4500);
  const recent = await p.evaluate(() => ({ txt: document.body.innerText, keys: Object.keys(localStorage).filter((k) => k.startsWith('act_recent')) }));
  check('Nepal recorded in recently viewed', /nepal/i.test(recent.txt), JSON.stringify(recent).slice(0, 200));

  // 4. personalization preference persists
  await p.goto(BASE + '/my/settings', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(4500);
  const before = await p.evaluate(() => document.querySelector('button[aria-label="Personalization"]')?.getAttribute('aria-pressed'));
  await p.evaluate(() => document.querySelector('button[aria-label="Personalization"]')?.click());
  await sleep(900);
  const after = await p.evaluate(() => ({ pressed: document.querySelector('button[aria-label="Personalization"]')?.getAttribute('aria-pressed'), prefs: Object.fromEntries(Object.keys(localStorage).filter((k) => /pref|consent/i.test(k)).map((k) => [k, localStorage.getItem(k)])) }));
  check('personalization toggles', before !== after.pressed, `${before} -> ${after.pressed}`);
  await p.reload({ waitUntil: 'domcontentloaded' });
  await sleep(4500);
  const persisted = await p.evaluate(() => document.querySelector('button[aria-label="Personalization"]')?.getAttribute('aria-pressed'));
  check('preference survives reload', persisted === after.pressed, `${after.pressed} -> ${persisted}`);

  check('no runtime errors', errs.filter((e) => !/tile|RSC|Failed to load resource/i.test(e)).length === 0, errs.slice(0, 3).join(' | '));
  await b.close();
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  if (failed.length) process.exit(1);
})().catch((e) => { console.error(e); process.exit(1); });
