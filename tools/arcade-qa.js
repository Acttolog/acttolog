/**
 * ACTTOLOG Arcade QA — run against the harvested mirror.
 *   python -m http.server 8140 --directory .pages-site
 *   ARCADE_QA_BASE=http://127.0.0.1:8140 node tools/arcade-qa.js
 */
const puppeteer = require('puppeteer');
const fs = require('fs');

const BASE = process.env.ARCADE_QA_BASE || 'http://127.0.0.1:8140';
const OUT = process.env.ARCADE_QA_OUT || 'C:/Users/acttolog/AppData/Local/arcadeqa/site';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(OUT, { recursive: true });

const GAMES = [
  { id: 'khoja-nepal', title: 'Khoja Nepal', marker: '#khMap' },
  { id: 'merge-himalaya', title: 'Merge Himalaya', marker: '.mh-board' },
  { id: 'himalaya-stack', title: 'Himalaya Stack', marker: '#hsCanvas' },
  { id: 'typerush-nepal', title: 'TypeRush Nepal', marker: '#trText' },
  { id: 'nepal-daily', title: 'Nepal Daily', marker: '.nd-opt' },
  { id: 'ludo-himalaya', title: 'Ludo Himalaya', marker: '.lh-board' },
  { id: 'snake-himalaya', title: 'Snake Himalaya', marker: '#snCanvas' },
  { id: 'himalaya-breakout', title: 'Himalaya Breakout', marker: '#boCanvas' },
  { id: 'danphe-flight', title: 'Danphe Flight', marker: '#dfCanvas' },
  { id: 'memory-nepal', title: 'Memory Nepal', marker: '.mn-grid' },
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

const errors = [];
const watch = (page, scope) => {
  page.on('pageerror', (e) => errors.push(scope + ' PAGE ' + e.message));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const t = m.text();
    if (/favicon/i.test(t)) return;
    errors.push(scope + ' CONSOLE ' + t.slice(0, 180));
  });
};

async function dismissConsent(page) {
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((x) =>
      /necessary only|essential only/i.test(x.textContent || ''),
    );
    if (b) b.click();
  });
  await sleep(300);
}

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--enable-unsafe-swiftshader',
      '--use-angle=swiftshader',
    ],
  });
  const page = await browser.newPage();
  watch(page, 'main');
  await page.setViewport({ width: 1440, height: 900 });

  // ── launcher ────────────────────────────────────────────
  console.log('\nLAUNCHER');
  await page.goto(BASE + '/arcade/index.html', { waitUntil: 'networkidle2', timeout: 60000 });
  await sleep(900);
  const launcher = await page.evaluate(() => ({
    cards: document.querySelectorAll('.gcard').length,
    covers: [...document.querySelectorAll('.gcard-cover img')].map((i) => i.naturalWidth),
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  }));
  check('ten game cards', launcher.cards === 10, 'got ' + launcher.cards);
  check(
    'all covers load',
    launcher.covers.length === 10 && launcher.covers.every((w) => w > 0),
    JSON.stringify(launcher.covers),
  );
  check('launcher desktop fits', !launcher.overflow);
  await page.screenshot({ path: OUT + '/launcher.png' });

  // ── mechanics ───────────────────────────────────────────
  console.log('\nMECHANICS');
  await page.goto(BASE + '/arcade/index.html?game=merge-himalaya', { waitUntil: 'networkidle2' });
  await sleep(700);
  for (let i = 0; i < 16; i++)
    await page.keyboard.press(['ArrowLeft', 'ArrowDown', 'ArrowRight', 'ArrowUp'][i % 4]);
  await sleep(500);
  const merge = await page.evaluate(() => {
    const b = document.querySelector('.mh-board')?.getBoundingClientRect();
    const t = document.querySelector('.mh-tile')?.getBoundingClientRect();
    return {
      tiles: document.querySelectorAll('.mh-tile').length,
      score: +(document.querySelector('#mhScore')?.textContent || 0),
      bw: b?.width || 0,
      tw: t?.width || 0,
    };
  });
  check('merge plays and scores', merge.tiles >= 2 && merge.score > 0, JSON.stringify(merge));
  check(
    'merge tiles fill the board',
    merge.tw > merge.bw * 0.18 && merge.tw < merge.bw * 0.3,
    `${merge.tw}/${merge.bw}`,
  );
  await page.screenshot({ path: OUT + '/merge.png' });

  await page.goto(BASE + '/arcade/index.html?game=himalaya-stack', { waitUntil: 'networkidle2' });
  await sleep(700);
  const box = await page.$eval('#hsCanvas', (c) => {
    const r = c.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  for (let i = 0; i < 3; i++) {
    await page.mouse.click(box.x + box.w / 2, box.y + box.h / 2);
    await sleep(240);
  }
  const stack = await page.evaluate(() => ({
    alt: +(document.querySelector('#hsAlt')?.textContent || 0),
    best: +(document.querySelector('#hsBest')?.textContent || 0),
    overlay: !!document.querySelector('.overlay'),
  }));
  check('stack climbs above base camp', stack.alt > 800, JSON.stringify(stack));
  check('stack saves a real best', stack.best > 800, JSON.stringify(stack));
  await page.screenshot({ path: OUT + '/stack.png' });

  await page.goto(BASE + '/arcade/index.html?game=typerush-nepal', { waitUntil: 'networkidle2' });
  await sleep(500);
  const passage = await page.evaluate(() =>
    [...document.querySelectorAll('.tr-char')].map((c) => c.textContent).join(''),
  );
  await page.click('#trStage');
  await page.keyboard.type(passage.slice(0, 30), { delay: 2 });
  await sleep(400);
  const tr = await page.evaluate(() => ({
    done: document.querySelectorAll('.tr-char.done').length,
    wpm: +(document.querySelector('#trWpm')?.textContent || 0),
    err: +(document.querySelector('#trErr')?.textContent || 0),
  }));
  check('typerush registers typing', tr.done >= 25 && tr.wpm > 0, JSON.stringify(tr));
  check('typerush has no false mistakes', tr.err === 0, JSON.stringify(tr));
  await page.click('#trEnd');
  await sleep(400);
  check('typerush result opens', await page.evaluate(() => !!document.querySelector('.overlay')));

  await page.goto(BASE + '/arcade/index.html?game=nepal-daily', { waitUntil: 'networkidle2' });
  await sleep(600);
  const ndBefore = await page.evaluate(() => ({
    hidden: document.querySelector('#ndNext')?.hidden,
    display: getComputedStyle(document.querySelector('#ndNext')).display,
  }));
  check(
    'daily hides Next before answering',
    ndBefore.hidden === true && ndBefore.display === 'none',
    JSON.stringify(ndBefore),
  );
  const opt = await page.$('.nd-opt');
  if (opt) await opt.click();
  await sleep(300);
  check(
    'daily reveals Next after answering',
    await page.evaluate(() => !document.querySelector('#ndNext')?.hidden),
  );
  await page.screenshot({ path: OUT + '/daily.png' });

  await page.goto(BASE + '/arcade/index.html?game=khoja-nepal', {
    waitUntil: 'networkidle2',
    timeout: 60000,
  });
  await sleep(3200);
  const kh = await page.evaluate(() => ({
    map: !!document.querySelector('.leaflet-container'),
    tiles: [...document.querySelectorAll('.leaflet-tile')].filter((t) => t.complete && t.naturalWidth > 0)
      .length,
    img: document.querySelector('#khImg')?.naturalWidth || 0,
    bar: document.querySelector('#khResult')?.hidden,
    barH: document.querySelector('#khResult')?.getBoundingClientRect().height || 0,
  }));
  check('khoja map and photo load', kh.map && kh.tiles > 4 && kh.img > 0, JSON.stringify(kh));
  check('khoja result bar hidden at start', kh.bar === true && kh.barH === 0, JSON.stringify(kh));
  const mb = await page.$eval('#khMap', (c) => {
    const r = c.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  await page.mouse.click(mb.x + mb.w / 2, mb.y + mb.h / 2);
  await sleep(300);
  await page.click('#khConfirm');
  await sleep(500);
  const khr = await page.evaluate(() => ({
    shown: !document.querySelector('#khResult')?.hidden,
    pts: document.querySelector('#khResult .pts')?.textContent,
  }));
  check('khoja scores a guess', khr.shown && /\d/.test(khr.pts || ''), JSON.stringify(khr));
  await page.screenshot({ path: OUT + '/khoja.png' });

  // ── games index ─────────────────────────────────────────
  console.log('\nGAMES INDEX');
  await page.goto(BASE + '/games/', { waitUntil: 'networkidle2', timeout: 60000 });
  await sleep(700);
  await dismissConsent(page);
  const list = await page.evaluate((games) => {
    const cards = [...document.querySelectorAll('a[href^="/games/"]')];
    return games.map((g) => {
      const a = cards.find((c) => c.getAttribute('href') === '/games/' + g.id);
      return { id: g.id, found: !!a, text: a ? a.innerText.replace(/\s+/g, ' ').toLowerCase() : '' };
    });
  }, GAMES);
  for (const g of list) {
    check('games index lists ' + g.id, g.found);
    check('games index CTA says Play Now — ' + g.id, /play now/.test(g.text));
  }
  await page.evaluate(() => {
    const a = document.querySelector('a[href="/games/khoja-nepal"]');
    if (a) window.scrollTo({ top: a.getBoundingClientRect().top + window.scrollY - 90, behavior: 'instant' });
  });
  await sleep(1200);
  await page.screenshot({ path: OUT + '/games-index.png' });

  // ── play now on every game page ─────────────────────────
  console.log('\nPLAY NOW EMBEDS');
  for (const g of GAMES) {
    const local = [];
    const p = await browser.newPage();
    watch(p, g.id);
    p.on('pageerror', (e) => local.push(e.message));
    await p.setViewport({ width: 1440, height: 1000 });
    await p.goto(BASE + '/games/' + g.id + '/', { waitUntil: 'networkidle2', timeout: 60000 });
    await sleep(500);
    await dismissConsent(p);
    const head = await p.evaluate(() => ({
      h1: document.querySelector('h1')?.textContent?.trim(),
      kicker:
        [...document.querySelectorAll('.mono')]
          .map((n) => n.textContent.trim())
          .find((t) => /free play/i.test(t)) || '',
    }));
    check('page heading — ' + g.id, head.h1 === g.title, head.h1);
    check(
      'kicker names the category — ' + g.id,
      head.kicker.length > 0 && !/2×2/.test(head.kicker),
      head.kicker,
    );
    const clicked = await p.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find((x) => /play now/i.test(x.textContent || ''));
      if (!b) return false;
      b.click();
      return true;
    });
    check('Play now button — ' + g.id, clicked);
    await p.waitForSelector('iframe[src*="/arcade/index.html"]', { timeout: 15000 }).catch(() => {});
    await sleep(4000);
    const frame = p.frames().find((f) => f.url().includes('/arcade/index.html'));
    let inFrame = null;
    if (frame) {
      inFrame = await frame
        .evaluate(
          (marker, title) => ({
            title: document.querySelector('#gvTitle')?.textContent?.trim(),
            marker: !!document.querySelector(marker),
            url: location.search,
          }),
          g.marker,
          g.title,
        )
        .catch(() => null);
    }
    check(
      'iframe mounts — ' + g.id,
      !!frame && frame.url().includes('game=' + g.id),
      frame ? frame.url() : 'no frame',
    );
    check(
      'iframe runs the right game — ' + g.id,
      !!inFrame && inFrame.title === g.title && inFrame.marker,
      JSON.stringify(inFrame),
    );
    check('no page errors — ' + g.id, local.length === 0, local.slice(0, 2).join(' | '));
    const shot = await p.evaluate(() => {
      const f = document.querySelector('iframe');
      if (f) f.scrollIntoView({ block: 'center' });
      return !!f;
    });
    await sleep(500);
    await p.screenshot({ path: OUT + '/play-' + g.id + '.png' });
    check('stage is visible — ' + g.id, shot);
    await p.close();
  }

  // ── mobile ──────────────────────────────────────────────
  console.log('\nMOBILE');
  const m = await browser.newPage();
  watch(m, 'mobile');
  await m.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await m.goto(BASE + '/arcade/index.html', { waitUntil: 'networkidle2' });
  await sleep(600);
  const ml = await m.evaluate(() => ({
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  }));
  check('launcher fits 390', !ml.overflow);
  await m.screenshot({ path: OUT + '/mobile-launcher.png', fullPage: true });
  await m.setViewport({ width: 320, height: 700, isMobile: true, hasTouch: true });
  await sleep(400);
  const m320 = await m.evaluate(() => ({
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  }));
  check('launcher fits 320', !m320.overflow);

  await m.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await m.goto(BASE + '/games/khoja-nepal/', { waitUntil: 'networkidle2' });
  await sleep(500);
  await dismissConsent(m);
  await m.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((x) => /play now/i.test(x.textContent || ''));
    if (b) b.click();
  });
  await sleep(4500);
  const mobileGame = await m.evaluate(() => ({
    url: location.pathname + location.search,
    title: document.querySelector('#gvTitle')?.textContent?.trim(),
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  }));
  check(
    'mobile Play now opens the game full page',
    mobileGame.url.includes('/arcade/index.html?game=khoja-nepal'),
    mobileGame.url,
  );
  check('mobile game mounts', mobileGame.title === 'Khoja Nepal', JSON.stringify(mobileGame));
  check('mobile game fits 390', !mobileGame.overflow);
  await m.screenshot({ path: OUT + '/mobile-khoja.png' });
  await m.close();

  check('no console/page errors anywhere', errors.length === 0, errors.slice(0, 4).join(' | '));

  console.log('\nRESULT ' + pass + ' passed, ' + fails.length + ' failed');
  if (fails.length) console.log('FAILURES\n- ' + fails.join('\n- '));
  await browser.close();
  process.exit(fails.length ? 1 : 0);
})().catch((e) => {
  console.error('FATAL', e);
  process.exit(1);
});
