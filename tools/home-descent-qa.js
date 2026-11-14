// Homepage descent — end-to-end browser QA.
// Serves .pages-site on 8140 (python -m http.server) and drives headless Chrome.
// The descent catches up synchronously on scroll when frames are starved, so
// samples only need plain polling (no screenshot pumps).
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const BASE = process.env.HOME_BASE || 'http://127.0.0.1:8140';
const OUT = path.join(__dirname, '..', '.shots');

let pass = 0;
let fail = 0;
const failures = [];
function check(ok, label, extra = '') {
  if (ok) {
    pass += 1;
    console.log(`  ok  ${label}`);
  } else {
    fail += 1;
    failures.push(label);
    console.log(`FAIL  ${label}${extra ? ` — ${extra}` : ''}`);
  }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function shot(page, file, timeout = 50000) {
  const ok = await Promise.race([
    page.screenshot({ path: path.join(OUT, file) }).then(
      () => true,
      () => false,
    ),
    sleep(timeout).then(() => false),
  ]);
  if (!ok) console.log(`  ..  screenshot ${file} skipped (compositor busy)`);
}

async function readState(page) {
  return page.evaluate(() => {
    const s = document.querySelector('.dsc');
    const gates = [...document.querySelectorAll('.dsc-gate')];
    const world = document.querySelector('.dsc-world');
    const gap = gates[1] ? -parseFloat(getComputedStyle(gates[1]).getPropertyValue('--gz')) : 0;
    const m = new DOMMatrix(getComputedStyle(world).transform);
    const r = s.getBoundingClientRect();
    const top = r.top + window.scrollY;
    const total = Math.max(1, r.height - window.innerHeight);
    const p = Math.max(0, Math.min(1, (window.scrollY - top) / total));
    const start = -gap;
    const end = (gates.length - 1) * gap + gap * 0.18;
    return {
      p,
      height: r.height,
      cam: m.m43,
      target: start + p * (end - start),
      gap,
      active: Number(s.dataset.active),
      started: s.dataset.started,
      depth: document.querySelector('.dsc-depth')?.textContent?.trim(),
      gates: gates.map((g) => ({
        opacity: Number(getComputedStyle(g).opacity),
        loaded: Boolean(g.querySelector('img')) && g.querySelector('img').naturalWidth > 0,
      })),
    };
  });
}

async function settle(page, { timeout = 12000, tolerance = 18 } = {}) {
  const deadline = Date.now() + timeout;
  let v = await readState(page);
  while (Math.abs(v.cam - v.target) > tolerance && Date.now() < deadline) {
    await sleep(160);
    v = await readState(page);
  }
  await sleep(160);
  return readState(page);
}

async function scrollToP(page, p) {
  await page.evaluate((pp) => {
    const s = document.querySelector('.dsc');
    const r = s.getBoundingClientRect();
    const top = r.top + window.scrollY;
    const total = Math.max(1, r.height - window.innerHeight);
    window.scrollTo({ top: top + pp * total, behavior: 'instant' });
  }, p);
  return settle(page);
}

async function waitActive(page, want, { timeout = 15000 } = {}) {
  const deadline = Date.now() + timeout;
  let st = await readState(page);
  while (st.active !== want && Date.now() < deadline) {
    await sleep(160);
    st = await readState(page);
  }
  return st;
}

async function dismissConsent(page) {
  return page.evaluate(() => {
    const btn = [...document.querySelectorAll('#consent button')].find((b) =>
      /necessary only/i.test(b.textContent || ''),
    );
    if (!btn) return false;
    btn.click();
    return true;
  });
}

// First-visit welcome appears 900 ms after consent is decided (once per browser).
async function dismissWelcome(page) {
  const already = await page.evaluate(() => {
    try {
      return Boolean(localStorage.getItem('act_welcomed'));
    } catch {
      return false;
    }
  });
  if (already) return true;
  const deadline = Date.now() + 8000;
  while (Date.now() < deadline) {
    const clicked = await page.evaluate(() => {
      const card = document.querySelector('.fv-card');
      if (!card) return false;
      const btn = [...card.querySelectorAll('button')].find((b) => /skip|स्किप/i.test(b.textContent || ''));
      if (!btn) return false;
      btn.click();
      return true;
    });
    if (clicked) {
      await sleep(350);
      return true;
    }
    await sleep(150);
  }
  return false;
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
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

  // ── desktop ────────────────────────────────────────────────────────────
  console.log('\nDESKTOP 1440×900');
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  const errors = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(`PAGEERROR ${e.message}`));
  const failedReq = [];
  page.on('requestfailed', (r) => failedReq.push(`${r.url()} ${r.failure()?.errorText}`));

  await page.goto(`${BASE}/`, { waitUntil: 'networkidle0', timeout: 60000 });
  await page.bringToFront();
  await page.waitForSelector('#hero', { timeout: 15000 });
  await page.waitForSelector('.dsc', { timeout: 15000 });
  await sleep(1400);
  await shot(page, 'home-hero.png');

  const count = await page.$$eval('.dsc-gate', (els) => els.length);
  check(count === 6, 'six gates render', `got ${count}`);
  const titles = await page.$$eval('.dsc-rail button .dsc-rail-lab', (els) =>
    els.map((e) => e.textContent.trim()),
  );
  check(titles.length === 6 && titles.every(Boolean), 'rail lists six named strata', titles.join(' / '));

  const heroBits = await page.evaluate(() => ({
    aura: Boolean(document.querySelector('.hero-aura')),
    rings: document.querySelectorAll('.hero-rings i').length,
    shards: document.querySelectorAll('.hero-shard').length,
    shardsVisible: [...document.querySelectorAll('.hero-shard')].every(
      (e) => e.getBoundingClientRect().width > 0,
    ),
    descentCta: Boolean(document.querySelector('a[href="#descent"].btn')),
  }));
  check(heroBits.aura && heroBits.rings === 3, 'hero aura + three orbit rings', JSON.stringify(heroBits));
  check(heroBits.shards === 2 && heroBits.shardsVisible, 'two glass HUD shards visible on desktop');
  check(heroBits.descentCta, 'hero “Begin descent” CTA points at #descent');

  const base = await readState(page);
  check(
    Math.abs(base.height - 900 * 5.4) < 900 * 0.1,
    'descent reserves ~540vh of scroll',
    `${Math.round(base.height)}px`,
  );
  check(base.gap > 400 && base.gap < 700, 'gate spacing measured', `${Math.round(base.gap)}px`);
  check(base.active === 0 && base.started === 'false', 'starts on stratum 1, not yet started');

  // the consent card must not cover the chapter copy
  await scrollToP(page, 0.2);
  const overlap = await page.evaluate(() => {
    const c = document.querySelector('#consent .panel')?.getBoundingClientRect();
    const t = document.querySelector('.dsc-chapter')?.getBoundingClientRect();
    if (!c || !t) return { present: false };
    const ix = Math.max(0, Math.min(c.right, t.right) - Math.max(c.left, t.left));
    const iy = Math.max(0, Math.min(c.bottom, t.bottom) - Math.max(c.top, t.top));
    return {
      present: true,
      area: Math.round(ix * iy),
      left: Math.round(c.left),
      chapterRight: Math.round(t.right),
    };
  });
  check(
    overlap.present && overlap.area === 0,
    'consent card clears the chapter copy',
    JSON.stringify(overlap),
  );
  const dismissed = await dismissConsent(page);
  check(dismissed, 'consent choices reachable');
  const welcomed = await dismissWelcome(page);
  check(welcomed, 'first-visit welcome is skippable');
  await sleep(500);

  // gate i passes the camera at p = (i+1) / (N + 0.18)
  const passOf = (i, n) => (i + 1) / (n + 0.18);
  const samples = [0.06, ...Array.from({ length: 6 }, (_, i) => passOf(i, 6)), 0.995];
  const shots = { 3: 'descent-d1-gate4', 6: 'descent-d1-core' };
  const cams = [];
  const actives = [];
  let gatesStrong = true;
  let passedDim = true;
  let imgsLoaded = true;
  for (let k = 0; k < samples.length; k += 1) {
    const p = samples[k];
    const m = await scrollToP(page, p);
    const nearest = Math.max(0, Math.min(5, Math.round(m.cam / m.gap)));
    cams.push(m.cam);
    actives.push(m.active);
    const isPass = k >= 1 && k <= 6;
    if (isPass) {
      if (m.active !== k - 1) gatesStrong = false;
      if (m.gates[k - 1].opacity < 0.95) gatesStrong = false;
      for (let i = 0; i < k - 3; i += 1) if (m.gates[i].opacity > 0.5) passedDim = false;
    }
    if (p === 0.06 && m.gates[0].opacity < 0.85) gatesStrong = false;
    imgsLoaded = imgsLoaded && m.gates.filter((g) => g.loaded).length >= Math.min(5, nearest + 1);
    if (shots[k]) await shot(page, `${shots[k]}.png`);
    console.log(
      `  sample=${k} p=${p.toFixed(3)} cam=${m.cam.toFixed(0)}/${m.target.toFixed(0)} active=${m.active + 1} depth=${m.depth} gate-ops=${m.gates.map((g) => g.opacity.toFixed(2)).join(',')}`,
    );
    if (k === 3)
      check(/^−\d{4} m$/.test(m.depth) && m.depth !== '−0000 m', 'HUD depth advances with descent', m.depth);
    if (k === samples.length - 1) {
      check(m.active === 5, 'final frame rests on the core', `active=${m.active + 1}`);
      check(m.depth === '−1440 m', 'HUD bottoms out at the core depth', m.depth);
      check(
        m.gates[5].opacity > 0.6,
        'core aperture is full-frame at the end',
        m.gates[5].opacity.toFixed(2),
      );
      check(
        m.gates[3].opacity < 0.2 && m.gates[4].opacity < 0.35,
        'earlier strata clear out of the core',
        `${m.gates[3].opacity.toFixed(2)}, ${m.gates[4].opacity.toFixed(2)}`,
      );
    }
  }
  check(
    cams.every((v, i) => i === 0 || v > cams[i - 1] + 40),
    'camera travels forward monotonically',
    cams.map((c) => Math.round(c)).join(' → '),
  );
  check(
    new Set(actives).size === 6,
    'every stratum activates in order',
    actives.map((a) => a + 1).join(' → '),
  );
  check(gatesStrong, 'each gate fills the frame as it passes (active + full opacity)');
  check(passedDim, 'strata three gates back have faded out');
  check(imgsLoaded, 'portal artwork loads as gates approach');

  // rail jump forward, then back to the top
  await page.click('.dsc-rail button:nth-of-type(4)');
  const jumped = await waitActive(page, 3);
  check(jumped.active === 3, 'rail jump lands on stratum 4', `active=${jumped.active + 1}`);
  check(
    Math.abs(jumped.cam / jumped.gap - 3) < 0.4,
    'camera lands on the chosen gate',
    `cam/gap=${(jumped.cam / jumped.gap).toFixed(2)}`,
  );

  await page.click('.dsc-rail button:nth-of-type(1)');
  const back = await waitActive(page, 0);
  check(back.active === 0, 'rail returns to stratum 1');

  const hud = await page.evaluate(() => ({
    gates: document.querySelector('.dsc-read em')?.textContent?.trim(),
    rate: document.querySelector('.dsc-rate')?.textContent?.trim(),
  }));
  check(/GATE\s*\d+\/06/.test(hud.gates || ''), 'HUD gate counter present', hud.gates);
  check(/^\d{1,2}\.\d m\/s$/.test(hud.rate || ''), 'HUD speed is plausible after cap', hud.rate);

  const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check(over <= 1, 'no horizontal overflow on desktop', `${over}px`);

  const composition = await page.evaluate(() => {
    const q = (s) => document.querySelector(s);
    const count = (s) => document.querySelectorAll(s).length;
    return {
      body: document.body.scrollHeight,
      vh: window.innerHeight,
      signal: Boolean(q('#signal')),
      index: Boolean(q('#index')),
      studio: Boolean(q('#studio')),
      close: Boolean(q('#cta')),
      nepal: Boolean(q('#nepal-promo')),
      rows: count('.hsignal-row'),
      cards: count('.hstudio-card'),
      divisions: count('.hindex-row'),
      removed: [
        '#world',
        '#ecosystem',
        '#divisions',
        '#featured',
        '#latest',
        '#acaPrev',
        '#darkPrev',
        '#offPrev',
        '#aboutPrev',
      ].filter((s) => q(s)),
      heroCta: count('#hero .btn-p.btn-lg'),
      heroLinks: count('#hero .hero-link'),
    };
  });
  check(
    composition.signal && composition.index && composition.studio && composition.close && composition.nepal,
    'home keeps five concise sections',
    JSON.stringify({
      signal: composition.signal,
      index: composition.index,
      studio: composition.studio,
      close: composition.close,
      nepal: composition.nepal,
    }),
  );
  check(composition.removed.length === 0, 'repeated homepage layers removed', composition.removed.join(', '));
  check(composition.divisions === 5, 'index lists five divisions once', `${composition.divisions}`);
  check(composition.cards === 3, 'studio presents three working surfaces', `${composition.cards}`);
  check(
    composition.heroCta === 1 && composition.heroLinks === 3,
    'hero carries one primary CTA + three quiet links (spatial, search, language)',
    `${composition.heroCta}/${composition.heroLinks}`,
  );
  check(
    composition.body < composition.vh * 12,
    'homepage is shorter than twelve viewports',
    `${Math.round(composition.body)}px = ${(composition.body / composition.vh).toFixed(1)}vh`,
  );

  check(errors.length === 0, 'no console errors on desktop', errors.slice(0, 3).join(' | '));

  const mediaFails = failedReq.filter((u) => /\/media\/descent\//.test(u));
  check(mediaFails.length === 0, 'no failed descent art requests', mediaFails.slice(0, 3).join(' | '));

  // ── mobile ─────────────────────────────────────────────────────────────
  console.log('\nMOBILE 390×844');
  const mob = await browser.newPage();
  await mob.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const mErrors = [];
  mob.on('console', (m) => {
    if (m.type() === 'error') mErrors.push(m.text());
  });
  mob.on('pageerror', (e) => mErrors.push(`PAGEERROR ${e.message}`));
  await mob.goto(`${BASE}/`, { waitUntil: 'networkidle0', timeout: 60000 });
  await mob.waitForSelector('.dsc', { timeout: 15000 });
  await sleep(1400);
  await dismissConsent(mob);
  await dismissWelcome(mob);
  await sleep(400);

  const mOver = await mob.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check(mOver <= 1, 'no horizontal overflow at 390px', `${mOver}px`);

  const mState = await scrollToP(mob, passOf(2, 6));
  check(mState.active === 2, 'mobile descent lands on the third gate', `active=${mState.active + 1}`);
  const gateFit = await mob.$$eval('.dsc-gate', (els) =>
    els.every((e) => e.offsetWidth <= window.innerWidth * 1.3),
  );
  check(gateFit, 'mobile gates size to the viewport');
  // Headless compositors can freeze the chapter entrance at its first
  // keyframe (translateY 28px) — capture and measure the resting layout.
  await mob.addStyleTag({ content: '.dsc-chapter{animation:none !important}' });
  await sleep(250);
  await shot(mob, 'descent-mobile-gate3.png');

  const mState2 = await scrollToP(mob, passOf(5, 6));
  check(mState2.active === 5, 'mobile descent reaches the core');
  check(
    mState2.cam > mState.cam + 100,
    'mobile camera travels farther',
    `${Math.round(mState.cam)} → ${Math.round(mState2.cam)}`,
  );

  const mHud = await mob.evaluate(() => {
    const c = document.querySelector('.dsc-copy');
    return c ? getComputedStyle(c).display : 'missing';
  });
  check(mHud !== 'none', 'mobile chapter copy visible');

  const mActs = await mob.evaluate(() => {
    const acts = document.querySelector('.dsc-copy .dsc-actions')?.getBoundingClientRect();
    const cmd = document.querySelector('.mobile-cmd')?.getBoundingClientRect();
    return acts
      ? {
          bottom: Math.round(acts.bottom),
          cmdTop: cmd ? Math.round(cmd.top) : window.innerHeight,
          vh: window.innerHeight,
        }
      : null;
  });
  check(
    Boolean(mActs) && mActs.bottom <= mActs.cmdTop - 4 && mActs.bottom <= mActs.vh,
    'mobile chapter actions clear the command bar',
    JSON.stringify(mActs),
  );

  const mHero = await mob.evaluate(() => ({
    shards: getComputedStyle(document.querySelector('.hero-shards')).display,
    rings: Boolean(document.querySelector('.hero-rings')),
  }));
  check(mHero.shards === 'none', 'hero shards hidden on narrow screens');
  check(mHero.rings, 'hero rings still render on mobile');
  check(mErrors.length === 0, 'no console errors on mobile', mErrors.slice(0, 3).join(' | '));
  await shot(mob, 'descent-mobile-core.png');

  // ── reduced motion ────────────────────────────────────────────────────
  console.log('\nREDUCED MOTION 1280×900');
  const red = await browser.newPage();
  await red.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 });
  await red.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  const rErrors = [];
  red.on('pageerror', (e) => rErrors.push(e.message));
  await red.goto(`${BASE}/`, { waitUntil: 'networkidle0', timeout: 60000 });
  await red.waitForSelector('.dsc[data-reduced="true"]', { timeout: 15000 });
  await sleep(800);
  const redState = await red.evaluate(() => {
    const s = document.querySelector('.dsc');
    const gates = [...document.querySelectorAll('.dsc-gate')];
    const boxes = gates.map((g) => g.getBoundingClientRect());
    return {
      height: s.getBoundingClientRect().height,
      vh: window.innerHeight,
      rail: getComputedStyle(document.querySelector('.dsc-rail-wrap')).display,
      opacities: gates.map((g) => Number(getComputedStyle(g).opacity)),
      transforms: gates.map((g) => getComputedStyle(g).transform),
      xs: boxes.map((b) => Math.round(b.left)),
      ys: boxes.map((b) => Math.round(b.top + window.scrollY)),
      copies: document.querySelectorAll('.dsc-gate-copy').length,
      staticHead: getComputedStyle(document.querySelector('.dsc-static-head')).display,
    };
  });
  check(
    redState.height < redState.vh * 9,
    'reduced mode drops the long scroll trap',
    `${Math.round(redState.height)}px`,
  );
  check(redState.rail === 'none', 'reduced mode hides the 3D rail');
  check(
    redState.opacities.every((o) => o === 1),
    'all gates fully visible in reduced mode',
    redState.opacities.join(','),
  );
  check(
    redState.transforms.every((t) => t === 'none'),
    'no 3D transforms in reduced mode',
  );
  check(
    redState.xs.every((x, i) => i === 0 || Math.abs(x - redState.xs[0]) < 3),
    'gates stack in one column',
  );
  check(
    redState.ys.every((y, i) => i === 0 || y > redState.ys[i - 1]),
    'gates stack top to bottom',
  );
  check(redState.copies === 6 && redState.staticHead !== 'none', 'static chapter copy + heading present');
  check(rErrors.length === 0, 'no page errors in reduced mode', rErrors.slice(0, 2).join(' | '));
  await red.evaluate(() =>
    document.querySelector('.dsc')?.scrollIntoView({ behavior: 'instant', block: 'start' }),
  );
  await sleep(500);
  await shot(red, 'descent-reduced.png');

  // ── art availability ──────────────────────────────────────────────────
  const art = await page.evaluate(async () => {
    const urls = ['research', 'darkroom', 'academy', 'entertainment', 'games'].map(
      (n) => `/media/descent/${n}.jpg`,
    );
    const out = [];
    for (const u of urls) {
      const r = await fetch(u, { method: 'HEAD' });
      out.push([u, r.status]);
    }
    return out;
  });
  check(
    art.every(([, s]) => s === 200),
    'all five portal images served',
    art.map(([, s]) => s).join(','),
  );

  await browser.close();
  console.log(`\n${pass} passed, ${fail} failed${fail ? ` — ${failures.join('; ')}` : ''}`);
  process.exit(fail ? 1 : 0);
})().catch((e) => {
  console.error('QA CRASH', e);
  process.exit(2);
});
