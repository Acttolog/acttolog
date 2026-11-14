// Live check: the deployed Pages homepage must run the descent end to end.
const puppeteer = require('puppeteer');
const path = require('path');

const BASE = process.env.LIVE_BASE || 'https://acttolog.github.io';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let pass = 0;
let fail = 0;
const bad = [];
function check(ok, label, extra = '') {
  if (ok) {
    pass += 1;
    console.log(`  ok  ${label}`);
  } else {
    fail += 1;
    bad.push(label);
    console.log(`FAIL  ${label}${extra ? ` — ${extra}` : ''}`);
  }
}

async function state(page) {
  return page.evaluate(() => {
    const s = document.querySelector('.dsc');
    const world = document.querySelector('.dsc-world');
    const gates = [...document.querySelectorAll('.dsc-gate')];
    const gap = gates[1] ? -parseFloat(getComputedStyle(gates[1]).getPropertyValue('--gz')) : 0;
    const r = s.getBoundingClientRect();
    const top = r.top + window.scrollY;
    const total = Math.max(1, r.height - window.innerHeight);
    const p = Math.max(0, Math.min(1, (window.scrollY - top) / total));
    return {
      p: +p.toFixed(3),
      gap,
      cam: Math.round(new DOMMatrix(getComputedStyle(world).transform).m43),
      target: Math.round(-gap + p * ((gates.length - 1) * gap + gap * 0.18 + gap)),
      active: Number(s.dataset.active),
      depth: document.querySelector('.dsc-depth')?.textContent?.trim(),
      imgs: gates.map((g) => Boolean(g.querySelector('img')) && g.querySelector('img').naturalWidth > 0),
      coreOp: Number(getComputedStyle(gates[5]).opacity),
      heights: Math.round(r.height),
    };
  });
}

async function scrollP(page, p) {
  await page.evaluate((pp) => {
    const s = document.querySelector('.dsc');
    const r = s.getBoundingClientRect();
    const top = r.top + window.scrollY;
    const total = Math.max(1, r.height - window.innerHeight);
    window.scrollTo({ top: top + pp * total, behavior: 'instant' });
  }, p);
  await sleep(1200);
}

async function waitActive(page, want, timeout = 8000) {
  const end = Date.now() + timeout;
  let st = await state(page);
  while (st.active !== want && Date.now() < end) {
    await sleep(200);
    st = await state(page);
  }
  return st;
}

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--enable-unsafe-swiftshader',
      '--use-angle=swiftshader',
      '--disable-features=CalculateNativeWinOcclusion',
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding',
      '--disable-backgrounding-occluded-windows',
    ],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  const errors = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(`PAGEERROR ${e.message}`));
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle0', timeout: 90000 });
  await page.waitForSelector('.dsc', { timeout: 30000 });
  await sleep(1200);

  check((await page.$$('.dsc-gate')).length === 6, 'live: six gates render');
  const height = (await state(page)).heights;
  check(Math.abs(height - 900 * 5.4) < 120, 'live: descent reserves ~540vh', `${height}px`);

  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('#consent button')].find((b) =>
      /necessary only/i.test(b.textContent || ''),
    );
    if (btn) btn.click();
  });
  await sleep(1600);
  await page.evaluate(() => {
    const card = document.querySelector('.fv-card');
    if (!card) return;
    const btn = [...card.querySelectorAll('button')].find((b) => /skip|स्किप/i.test(b.textContent || ''));
    if (btn) btn.click();
  });
  await sleep(500);

  const passOf = (i) => (i + 1) / 6.18;
  await scrollP(page, passOf(2));
  const mid = await state(page);
  check(
    mid.active === 2,
    'live: third stratum active',
    `active=${mid.active + 1} cam=${mid.cam}/${mid.target}`,
  );
  check(Math.abs(mid.cam - mid.target) < 30, 'live: camera tracks scroll', `${mid.cam}/${mid.target}`);
  check(mid.imgs.filter(Boolean).length >= 3, 'live: portal art loads', mid.imgs.map(Number).join(''));

  await scrollP(page, 0.995);
  const end = await state(page);
  check(end.active === 5, 'live: final frame rests on the core', `active=${end.active + 1}`);
  check(end.depth === '−1440 m', 'live: depth HUD bottoms out', end.depth);
  check(end.coreOp > 0.6, 'live: core aperture fills the frame', end.coreOp.toFixed(2));

  await page.click('.dsc-rail button:nth-of-type(2)');
  await sleep(2200);
  const jump = await state(page);
  check(jump.active === 1, 'live: rail jumps to stratum 2', `active=${jump.active + 1} cam=${jump.cam}`);

  const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check(over <= 1, 'live: no horizontal overflow', `${over}px`);

  const comp = await page.evaluate(() => ({
    body: document.body.scrollHeight,
    vh: window.innerHeight,
    signal: Boolean(document.querySelector('#signal')),
    index: Boolean(document.querySelector('#index')),
    studio: Boolean(document.querySelector('#studio')),
    nepal: Boolean(document.querySelector('#nepal-promo')),
    rows: document.querySelectorAll('.hindex-row').length,
    cards: document.querySelectorAll('.hstudio-card').length,
  }));
  check(comp.signal && comp.index && comp.studio && comp.nepal, 'live: concise sections present');
  check(
    comp.rows === 5 && comp.cards === 3,
    'live: one division index + three studio surfaces',
    `${comp.rows}/${comp.cards}`,
  );
  check(
    comp.body < comp.vh * 12,
    'live: page under twelve viewports',
    `${Math.round(comp.body)}px = ${(comp.body / comp.vh).toFixed(1)}vh`,
  );

  check(errors.length === 0, 'live: no console errors', errors.slice(0, 2).join(' | '));

  await page.screenshot({ path: path.join(__dirname, '..', '.shots', 'descent-live-gate2.png') });

  // mobile sanity
  const mob = await browser.newPage();
  await mob.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await mob.goto(`${BASE}/`, { waitUntil: 'networkidle0', timeout: 90000 });
  await mob.waitForSelector('.dsc', { timeout: 30000 });
  await sleep(1200);
  await scrollP(mob, passOf(2));
  const m = await waitActive(mob, 2);
  check(
    m.active === 2,
    'live mobile: third stratum active',
    `active=${m.active + 1} cam=${m.cam}/${m.target}`,
  );
  const mOver = await mob.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check(mOver <= 1, 'live mobile: no horizontal overflow', `${mOver}px`);

  await browser.close();
  console.log(`\n${pass} passed, ${fail} failed${fail ? ` — ${bad.join('; ')}` : ''}`);
  process.exit(fail ? 1 : 0);
})().catch((e) => {
  console.error('LIVE CHECK CRASH', e);
  process.exit(2);
});
