/**
 * Playtest for the four new arcade games, served straight from public/.
 *   node tools/serve-static.js public 8141
 *   ARCADE_QA_BASE=http://127.0.0.1:8141 node tools/arcade-new-games-qa.js
 */
const puppeteer = require('puppeteer');
const fs = require('fs');

const BASE = process.env.ARCADE_QA_BASE || 'http://127.0.0.1:8141';
const OUT = process.env.ARCADE_QA_OUT || 'C:/Users/acttolog/AppData/Local/arcadeqa/new-games';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(OUT, { recursive: true });

const NEW = [
  { id: 'snake-himalaya', title: 'Snake Himalaya' },
  { id: 'himalaya-breakout', title: 'Himalaya Breakout' },
  { id: 'danphe-flight', title: 'Danphe Flight' },
  { id: 'memory-nepal', title: 'Memory Nepal' },
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
  page.on('pageerror', (e) => {
    if (/WebGL|THREE/i.test(e.message)) return;
    errors.push(scope + ' PAGE ' + e.message);
  });
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const t = m.text();
    if (/favicon|WebGL|THREE/i.test(t)) return;
    errors.push(scope + ' CONSOLE ' + t.slice(0, 180));
  });
};

const canvasShot = (page, sel) =>
  page.evaluate((s) => document.querySelector(s)?.toDataURL('image/png').slice(-220) || '', sel);

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding',
      '--disable-backgrounding-occluded-windows',
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
  const launcher = await page.evaluate((games) => {
    const cards = [...document.querySelectorAll('.gcard')];
    return {
      count: cards.length,
      covers: [...document.querySelectorAll('.gcard-cover img')].map((i) => i.naturalWidth),
      newCards: games.map((g) => {
        const a = cards.find((c) => c.getAttribute('href') === '?game=' + g.id);
        return { id: g.id, found: !!a, text: a ? a.innerText.replace(/\s+/g, ' ') : '' };
      }),
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    };
  }, NEW);
  check('ten game cards', launcher.count === 10, 'got ' + launcher.count);
  check(
    'all ten covers load',
    launcher.covers.length === 10 && launcher.covers.every((w) => w > 0),
    JSON.stringify(launcher.covers),
  );
  for (const c of launcher.newCards) {
    check('launcher lists ' + c.id, c.found && c.text.length > 0, c.text.slice(0, 60));
  }
  check('launcher desktop fits', !launcher.overflow);
  await page.screenshot({ path: OUT + '/launcher.png' });

  // ── snake ───────────────────────────────────────────────
  console.log('\nSNEK HIMALAYA');
  await page.goto(BASE + '/arcade/index.html?game=snake-himalaya', { waitUntil: 'networkidle2' });
  await sleep(700);
  check('snake mounts', await page.evaluate(() => !!document.querySelector('#snCanvas')));
  check('snake start overlay', await page.evaluate(() => !!document.querySelector('#snStart')));
  await page.click('#snStart');
  await sleep(400);
  const snA = await canvasShot(page, '#snCanvas');
  await sleep(600);
  const snB = await canvasShot(page, '#snCanvas');
  check('snake animates', snA.length > 0 && snA !== snB);
  await page.keyboard.press('ArrowUp'); // steer into the top wall
  await sleep(3200);
  const snEnd = await page.evaluate(() => ({
    overlay: !!document.querySelector('#snAgain'),
    text: document.querySelector('.overlay-card')?.innerText.replace(/\s+/g, ' ').slice(0, 80) || '',
  }));
  check('snake wall collision ends run', snEnd.overlay, JSON.stringify(snEnd));
  await page.screenshot({ path: OUT + '/snake.png' });
  await page.click('#snAgain');
  await sleep(400);
  check(
    'snake restart clears overlay',
    await page.evaluate(() => !document.querySelector('.overlay')),
  );

  // ── breakout ────────────────────────────────────────────
  console.log('\nHIMALAYA BREAKOUT');
  await page.goto(BASE + '/arcade/index.html?game=himalaya-breakout', { waitUntil: 'networkidle2' });
  await sleep(700);
  check('breakout mounts', await page.evaluate(() => !!document.querySelector('#boCanvas')));
  await page.click('#boStart');
  await sleep(300);
  const boBox = await page.$eval('#boCanvas', (c) => {
    const r = c.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  await page.mouse.move(boBox.x + boBox.w / 2, boBox.y + boBox.h - 30);
  await page.keyboard.press('Space'); // launch
  let bo = { score: 0, lives: 3 };
  for (let i = 0; i < 20; i++) {
    await sleep(500);
    bo = await page.evaluate(() => ({
      score: +(document.querySelector('#boScore')?.textContent || 0),
      lives: +(document.querySelector('#boLives')?.textContent || 3),
      overlay: !!document.querySelector('.overlay'),
    }));
    if (bo.score > 0) break;
  }
  check('breakout bricks score', bo.score > 0, JSON.stringify(bo));
  const boA = await canvasShot(page, '#boCanvas');
  await sleep(500);
  const boB = await canvasShot(page, '#boCanvas');
  check('breakout animates', boA.length > 0 && boA !== boB);
  await page.screenshot({ path: OUT + '/breakout.png' });

  // ── danphe ──────────────────────────────────────────────
  console.log('\nDANPHE FLIGHT');
  await page.goto(BASE + '/arcade/index.html?game=danphe-flight', { waitUntil: 'networkidle2' });
  await sleep(700);
  check('danphe mounts', await page.evaluate(() => !!document.querySelector('#dfCanvas')));
  await page.click('#dfStart');
  let df = { score: 0, overlay: false };
  for (let i = 0; i < 22; i++) {
    await page.keyboard.press('Space');
    await sleep(570); // near-neutral hover: -400 flap vs 1400 gravity
    if (i % 2 === 1) {
      df = await page.evaluate(() => ({
        score: +(document.querySelector('#dfScore')?.textContent || 0),
        overlay: !!document.querySelector('#dfAgain'),
      }));
      if (df.score >= 2 || df.overlay) break;
    }
  }
  check('danphe passes pillars or ends honestly', df.score >= 1 || df.overlay, JSON.stringify(df));
  if (df.overlay) {
    await page.click('#dfAgain');
    await sleep(400);
    check(
      'danphe restart resets',
      await page.evaluate(
        () => !document.querySelector('.overlay') && document.querySelector('#dfScore').textContent === '0',
      ),
    );
  }
  const dfA = await canvasShot(page, '#dfCanvas');
  await sleep(400);
  const dfB = await canvasShot(page, '#dfCanvas');
  check('danphe animates', dfA.length > 0 && dfA !== dfB);
  await page.screenshot({ path: OUT + '/danphe.png' });

  // ── memory ──────────────────────────────────────────────
  console.log('\nMEMORY NEPAL');
  await page.goto(BASE + '/arcade/index.html?game=memory-nepal', { waitUntil: 'networkidle2' });
  await sleep(700);
  const mnSetup = await page.evaluate(() => ({
    cards: document.querySelectorAll('.mn-card').length,
    syms: [...document.querySelectorAll('.mn-card')].map((c) => c.dataset.sym),
  }));
  check('memory deals 16 cards', mnSetup.cards === 16, 'got ' + mnSetup.cards);
  check('memory deals 8 distinct pairs', new Set(mnSetup.syms).size === 8);

  // mismatch first: two different symbols must flip back
  const mis = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('.mn-card')];
    const a = cards[0];
    const b = cards.find((c) => c.dataset.sym !== a.dataset.sym);
    a.click();
    b.click();
    return { moves: document.querySelector('#mnMoves').textContent, open: document.querySelectorAll('.mn-card.open').length };
  });
  check('memory counts a move', mis.moves === '1' && mis.open === 2, JSON.stringify(mis));
  await sleep(1100);
  check(
    'memory flips mismatch back',
    await page.evaluate(() => document.querySelectorAll('.mn-card.open').length === 0),
  );

  // solve the board from data-sym
  const pairs = await page.evaluate(() => {
    const bySym = {};
    [...document.querySelectorAll('.mn-card')].forEach((c) => {
      (bySym[c.dataset.sym] ||= []).push(c.dataset.idx);
    });
    return Object.values(bySym);
  });
  for (const [a, b] of pairs) {
    await page.click(`.mn-card[data-idx="${a}"]`);
    await sleep(120);
    await page.click(`.mn-card[data-idx="${b}"]`);
    await sleep(220);
  }
  await sleep(500);
  const mnWin = await page.evaluate(() => ({
    overlay: !!document.querySelector('#mnAgain'),
    pairs: document.querySelector('#mnPairs')?.textContent,
    moves: document.querySelector('#mnMoves')?.textContent,
    done: document.querySelectorAll('.mn-card.done').length,
    best: localStorage.getItem('arcade:v1:memory:best'),
    heading: document.querySelector('.overlay-card h3')?.textContent || '',
  }));
  check('memory win overlay', mnWin.overlay && mnWin.heading === 'Sabai milo!', JSON.stringify(mnWin));
  check('memory all pairs matched', mnWin.pairs === '8/8' && mnWin.done === 16, JSON.stringify(mnWin));
  check('memory best persisted', mnWin.best === '9', 'best=' + mnWin.best);
  await page.screenshot({ path: OUT + '/memory.png' });
  await page.click('#mnAgain');
  await sleep(400);
  check(
    'memory redeal resets',
    await page.evaluate(
      () =>
        document.querySelector('#mnMoves').textContent === '0' &&
        document.querySelectorAll('.mn-card.open').length === 0 &&
        !document.querySelector('.overlay'),
    ),
  );

  // ── destroy on navigation ───────────────────────────────
  console.log('\nNAVIGATION / DESTROY');
  for (const g of NEW) {
    await page.goto(BASE + '/arcade/index.html?game=' + g.id, { waitUntil: 'networkidle2' });
    await sleep(450);
    await page.goto(BASE + '/arcade/index.html', { waitUntil: 'networkidle2' });
    await sleep(350);
    check(
      'back to launcher after ' + g.id,
      await page.evaluate(() => document.querySelectorAll('.gcard').length === 10),
    );
  }

  // ── mobile fit ──────────────────────────────────────────
  console.log('\nMOBILE');
  const m = await browser.newPage();
  watch(m, 'mobile');
  await m.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  for (const g of NEW) {
    await m.goto(BASE + '/arcade/index.html?game=' + g.id, { waitUntil: 'networkidle2' });
    await sleep(600);
    const fit = await m.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      title: document.querySelector('.g-head h2')?.textContent || '',
    }));
    check('mobile fits 390 — ' + g.id, !fit.overflow && fit.title.length > 0, JSON.stringify(fit));
    await m.screenshot({ path: OUT + '/mobile-' + g.id + '.png' });
  }
  await m.setViewport({ width: 320, height: 700, isMobile: true, hasTouch: true });
  await m.goto(BASE + '/arcade/index.html?game=memory-nepal', { waitUntil: 'networkidle2' });
  await sleep(500);
  check(
    'memory fits 320',
    await m.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1),
  );
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