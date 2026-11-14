// Ludo Himalaya — end-to-end browser QA.
// Serves public/ on 8130 (python -m http.server) and drives headless Chrome.
const puppeteer = require('puppeteer');
const path = require('path');

const BASE = process.env.ARCADE_BASE || 'http://127.0.0.1:8130';
const GAME = `${BASE}/arcade/index.html?game=ludo-himalaya&ludoTest=1`;
const LAUNCHER = `${BASE}/arcade/index.html`;
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

// Headless pages are "hidden", so in-page timers (Puppeteer's polling and rAF)
// are throttled to ~1s — poll from Node over CDP instead to observe short phases.
async function waitFor(page, fn, { timeout = 9000, interval = 40, args = [] } = {}) {
  const deadline = Date.now() + timeout;
  for (;;) {
    if (await page.evaluate(fn, ...args)) return;
    if (Date.now() > deadline) throw new Error(`waitFor timed out after ${timeout}ms`);
    await sleep(interval);
  }
}

async function fresh(page) {
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle0' });
  await page.waitForSelector('.lh-setupcard', { timeout: 8000 });
}
async function start(page, cfg) {
  await page.evaluate((c) => window.__ludo.start(c), cfg);
  await waitFor(page, () => window.__ludo && window.__ludo.phase() === 'rolling', { timeout: 6000 });
}
async function phase(page, want, timeout = 9000) {
  await waitFor(page, (p) => window.__ludo.phase() === p, { timeout, args: [want] });
}
async function idle(page, timeout = 9000) {
  await waitFor(page, () => !window.__ludo.busy(), { timeout });
}
async function state(page) {
  return page.evaluate(() => window.__ludo.state());
}

(async () => {
  const fs = require('fs');
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--enable-unsafe-swiftshader',
      '--use-angle=swiftshader',
      '--autoplay-policy=no-user-gesture-required',
    ],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 950, deviceScaleFactor: 1 });
  const errors = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(`PAGEERROR ${e.message}`));

  console.log('\n— boot & setup —');
  await page.goto(GAME, { waitUntil: 'networkidle0', timeout: 45000 });
  await fresh(page);
  const setup = await page.evaluate(() => ({
    open: window.__ludo.setupOpen(),
    players: document.querySelector('[data-players="2"]').classList.contains('on'),
    mode: document.querySelector('[data-mode="cpu"]').classList.contains('on'),
    sharp: document.querySelector('[data-diff="sharp"]').classList.contains('on'),
    three: document.querySelector('[data-opt="threeSixes"]').checked,
    auto: document.querySelector('[data-opt="autoSelect"]').checked,
    block: document.querySelector('[data-opt="blockades"]').checked,
    chips: document.querySelectorAll('.lh-chip').length,
    resume: Boolean(document.querySelector('.lh-resume')),
    games: null,
  }));
  check(setup.open && setup.players && setup.mode && setup.sharp, 'setup opens on defaults (2P, CPU, sharp)');
  check(setup.three && setup.auto && !setup.block, 'house rule defaults (sixes + auto-move on)');
  check(setup.chips === 2 && !setup.resume, 'two colour chips, no phantom resume');
  await page.screenshot({ path: path.join(OUT, 'ludo-qa-01-setup.png') });

  await page.click('[data-players="4"]');
  await page.click('[data-diff="easy"]');
  await page.click('[data-mode="human"]');
  const setup4 = await page.evaluate(() => ({
    chips: document.querySelectorAll('.lh-chip').length,
    diffHidden: document.querySelector('.lh-difffield').hidden,
  }));
  check(setup4.chips === 4, '4 players shows four colour chips');
  check(setup4.diffHidden, 'CPU skill hides in pass & play');
  await page.click('#lhStart');
  await waitFor(page, () => window.__ludo.state()?.players.length === 4, { timeout: 6000 });
  const started = await state(page);
  check(
    started.players.every((p) => p.type === 'human'),
    'pass & play starts four humans',
  );
  check(
    (await page.evaluate(() => document.querySelectorAll('.lh-token').length)) === 16,
    '16 marbles on a 4-player board',
  );
  check(
    (await page.evaluate(() => document.querySelectorAll('.lh-home.unused').length)) === 0,
    'all four yards in play',
  );
  const boardDetail = await page.evaluate(() => ({
    runners: document.querySelectorAll('.lh-runner').length,
    chevs: document.querySelectorAll('.lh-chev').length,
    medal: Boolean(document.querySelector('.lh-medal')),
    turn: document.querySelector('#lhBoard').dataset.turn,
  }));
  check(
    boardDetail.runners === 4 && boardDetail.chevs === 20 && boardDetail.medal,
    'board shows start arrows, home chevrons and the centre medal',
  );
  check(boardDetail.turn === 'red', 'board lights the active player');
  await page.screenshot({ path: path.join(OUT, 'ludo-qa-02-board4.png') });

  console.log('\n— rules modal —');
  await page.click('[data-act="rules"]');
  await page.waitForSelector('#lhRules:not([hidden]) .lh-rulescard');
  check(
    (await page.evaluate(() => document.querySelectorAll('.lh-rulelist li').length)) === 7,
    'rules list has all 7 rules',
  );
  await page.screenshot({ path: path.join(OUT, 'ludo-qa-03-rules.png') });
  await page.keyboard.press('Escape');
  await waitFor(page, () => document.querySelector('#lhRules').hidden, { timeout: 3000 });
  check((await page.evaluate(() => window.__ludo.phase())) === 'rolling', 'closing rules resumes the turn');

  console.log('\n— dice, no-move, movement —');
  await fresh(page);
  await start(page, { players: 2, mode: 'human', options: { autoSelect: false, threeSixes: true } });
  await page.evaluate(() => window.__ludo.speed(0));
  const atRest = await page.evaluate(() => ({
    visible: document.querySelector('#lhBoardDice').classList.contains('is-visible'),
    faces: document.querySelectorAll('#lhBCube .lh-face').length,
    cube: document.querySelector('#lhBCube').style.transform,
    left: parseFloat(document.querySelector('#lhBSpot').style.left),
    shadow: Boolean(document.querySelector('#lhBShadow')),
  }));
  check(
    atRest.visible && atRest.faces === 6 && atRest.shadow && /rotateX/.test(atRest.cube),
    'a physical die rests on the board',
  );
  check(atRest.left > 30 && atRest.left < 38, 'the die sits in the starting player’s yard');
  await page.evaluate(() => window.__ludo.roll(3));
  await phase(page, 'no-move');
  check((await state(page)).turn === 0, 'no-move phase holds the turn briefly');
  await waitFor(page, () => window.__ludo.state().turn === 1, { timeout: 4000 });
  check((await page.evaluate(() => window.__ludo.phase())) === 'rolling', 'no move passes the turn');
  const parked = await page.evaluate(() => parseFloat(document.querySelector('#lhBSpot').style.left));
  check(parked > 62 && parked < 69, 'the die changes hands with the turn');

  await page.evaluate(() => window.__ludo.setTurn(0));
  const cubeBefore = await page.evaluate(() => document.querySelector('#lhBCube').style.transform);
  await page.evaluate(() => window.__ludo.roll(6));
  await phase(page, 'choosing');
  const cubeAfter = await page.evaluate(() => document.querySelector('#lhBCube').style.transform);
  check(Boolean(cubeBefore) && cubeAfter !== cubeBefore, 'the thrown die tumbles and settles');
  const choosing = await page.evaluate(() => ({
    marks: document.querySelectorAll('.lh-mark').length,
    can: document.querySelectorAll('.lh-token.can-move').length,
    status: document.querySelector('#lhStatus').textContent,
  }));
  check(choosing.marks === 1, 'one destination mark for four yard marbles');
  check(choosing.can === 4, 'all four yard marbles glow');
  check(/six/i.test(choosing.status), 'status announces the six');
  await page.screenshot({ path: path.join(OUT, 'ludo-qa-04-choosing.png') });
  await page.evaluate(() => window.__ludo.pick(2));
  await idle(page);
  let s = await state(page);
  check(s.players[0].tokens[2] === 0, 'marble left the yard on a six');
  check(s.phase === 'rolling' && s.turn === 0, 'six earns another roll');
  check(
    await page.evaluate(() => document.querySelector('#lhStreak .on') !== null),
    'streak pip lights on six',
  );

  await page.evaluate(() => window.__ludo.roll(3));
  await phase(page, 'choosing');
  await page.evaluate(() => window.__ludo.pick(2));
  await idle(page);
  s = await state(page);
  check(s.players[0].tokens[2] === 3, 'marble walked three squares');
  check(s.turn === 1, 'normal roll passes the turn');

  console.log('\n— capture —');
  await fresh(page);
  await start(page, { players: 2, mode: 'human', options: { autoSelect: false } });
  await page.evaluate(() => {
    window.__ludo.speed(0);
    window.__ludo.setTurn(0);
    window.__ludo.setToken('red', 0, 5);
    window.__ludo.setToken('yellow', 0, 32);
    window.__ludo.roll(1);
  });
  await phase(page, 'choosing');
  await page.evaluate(() => window.__ludo.pick(0));
  await idle(page);
  s = await state(page);
  check(s.players[0].tokens[0] === 6, 'red lands on the yellow marble');
  check(s.players[1].tokens[0] === -1, 'captured marble returns to its yard');
  check(s.players[0].captures === 1, 'capture counter increments');
  check(s.turn === 0 && s.phase === 'rolling', 'capture earns another roll');
  const feed = await page.evaluate(() => window.__ludo.feed());
  check(
    feed.some((f) => /captur/i.test(f)),
    'play-by-play records the capture',
  );
  await sleep(400);
  await page.screenshot({ path: path.join(OUT, 'ludo-qa-05-capture.png') });

  await page.evaluate(() => {
    window.__ludo.speed(null);
    window.__ludo.setToken('red', 0, 5);
    window.__ludo.setToken('yellow', 0, 32);
    window.__ludo.setTurn(0);
    window.__ludo.roll(1);
  });
  await phase(page, 'choosing');
  await page.evaluate(() => window.__ludo.pick(0));
  const sawGhost = await waitFor(page, () => Boolean(document.querySelector('.lh-token.is-ghost')), {
    timeout: 4000,
    interval: 30,
  })
    .then(() => true)
    .catch(() => false);
  check(sawGhost, 'captured marble flies home across the board');
  await idle(page);
  await page.evaluate(() => window.__ludo.speed(0));

  console.log('\n— triple sixes forfeit —');
  await fresh(page);
  await start(page, { players: 2, mode: 'human', options: { autoSelect: false, threeSixes: true } });
  await page.evaluate(() => {
    window.__ludo.speed(0);
    window.__ludo.setTurn(0);
    window.__ludo.queue(6, 6, 6);
  });
  await page.evaluate(() => window.__ludo.roll());
  await phase(page, 'choosing');
  await page.evaluate(() => window.__ludo.pick(0));
  await idle(page);
  await page.evaluate(() => window.__ludo.roll());
  await phase(page, 'choosing');
  await page.evaluate(() => window.__ludo.pick(0));
  await idle(page);
  await page.evaluate(() => window.__ludo.roll());
  await phase(page, 'forfeit');
  check((await state(page)).sixes === 3, 'third six detected');
  await waitFor(page, () => window.__ludo.state().turn === 1, { timeout: 4000 });
  check(
    (await page.evaluate(() => window.__ludo.phase())) === 'rolling',
    'triple six forfeits the whole turn',
  );

  console.log('\n— exact finish & win —');
  await fresh(page);
  await start(page, { players: 2, mode: 'human', options: { autoSelect: false } });
  await page.evaluate(() => {
    window.__ludo.speed(0);
    window.__ludo.setToken('red', 0, 56);
    window.__ludo.setToken('red', 1, 56);
    window.__ludo.setToken('red', 2, 56);
    window.__ludo.setToken('red', 3, 55);
    window.__ludo.setTurn(0);
    window.__ludo.roll(1);
  });
  await phase(page, 'choosing');
  await page.evaluate(() => window.__ludo.pick(3));
  await waitFor(page, () => window.__ludo.resultOpen(), { timeout: 8000 });
  s = await state(page);
  check(s.winner === 'red' && s.phase === 'over', 'fourth marble home wins the match');
  check(
    (await page.evaluate(() => document.querySelectorAll('.lh-standing').length)) === 2,
    'result lists the standings',
  );
  check(
    (await page.evaluate(() => document.querySelectorAll('.lh-confetti i').length)) > 0,
    'confetti renders',
  );
  check(
    await page.evaluate(() => {
      const raw = localStorage.getItem('arcade:v1:ludo:save');
      return raw === null || raw === 'null';
    }),
    'winning clears the saved match',
  );
  const stats = await page.evaluate(() => JSON.parse(localStorage.getItem('arcade:v1:ludo:stats')));
  check(stats && stats.played === 1 && stats.wins === 1, 'stats record a win');
  await page.screenshot({ path: path.join(OUT, 'ludo-qa-06-result.png') });
  await page.click('[data-result="again"]');
  await waitFor(page, () => !window.__ludo.resultOpen(), { timeout: 5000 });
  s = await state(page);
  check(s.phase === 'rolling' && s.players[0].tokens.every((t) => t === -1), 'play again resets the table');

  console.log('\n— save & resume —');
  await fresh(page);
  await start(page, { players: 2, mode: 'human', options: { autoSelect: true } });
  await page.evaluate(() => {
    window.__ludo.speed(0);
    window.__ludo.setTurn(0);
    window.__ludo.setToken('red', 0, 12);
    window.__ludo.roll(6);
  });
  await phase(page, 'choosing');
  await page.evaluate(() => window.__ludo.pick(0));
  await idle(page);
  const before = await state(page);
  await sleep(200);
  await page.reload({ waitUntil: 'networkidle0' });
  await page.waitForSelector('.lh-setupcard');
  check(
    await page.evaluate(() => Boolean(document.querySelector('.lh-resume'))),
    'reload offers the saved match',
  );
  await page.screenshot({ path: path.join(OUT, 'ludo-qa-07-resume.png') });
  await page.click('[data-act="resume"]');
  await waitFor(page, () => window.__ludo.phase() === 'rolling', { timeout: 6000 });
  const after = await state(page);
  check(
    JSON.stringify(after.players.map((p) => p.tokens)) ===
      JSON.stringify(before.players.map((p) => p.tokens)),
    'resume restores every marble',
  );
  check(after.turn === before.turn && after.rolls === before.rolls, 'resume restores turn and roll count');

  console.log('\n— CPU autoplay —');
  await fresh(page);
  await start(page, { players: 2, mode: 'cpu', difficulty: 'sharp', options: { autoSelect: true } });
  await page.evaluate(() => {
    window.__ludo.speed(0);
    window.__ludo.queue(6);
  });
  await page.evaluate(() => window.__ludo.roll());
  await phase(page, 'choosing');
  await page.evaluate(() => window.__ludo.pick(0));
  await idle(page);
  await page.evaluate(() => window.__ludo.roll(3));
  await idle(page);
  await waitFor(
    page,
    () => {
      const st = window.__ludo.state();
      return st.rolls >= 3 && st.turn === 0 && st.phase === 'rolling';
    },
    { timeout: 25000, interval: 120 },
  );
  s = await state(page);
  check(s.rolls >= 3, 'CPU rolls without input');
  check(
    s.players[1].tokens.some((t) => t >= 0) || s.players[1].tokens.every((t) => t < 0),
    'CPU turn completes',
  );
  check(
    (await page.evaluate(() => !document.querySelector('#lhRoll').disabled)) === true,
    'control returns to the human',
  );

  console.log('\n— tools —');
  const soundBefore = await page.evaluate(() =>
    document.querySelector('[data-act="sound"]').textContent.trim(),
  );
  await page.click('[data-act="sound"]');
  const soundAfter = await page.evaluate(() =>
    document.querySelector('[data-act="sound"]').textContent.trim(),
  );
  check(soundBefore !== soundAfter, 'sound toggle relabels');
  await page.click('[data-act="view"]');
  check(
    await page.evaluate(() => document.querySelector('#lhRoot').classList.contains('flat')),
    '3D toggle switches to flat',
  );
  const flatSettled = await waitFor(
    page,
    () => getComputedStyle(document.querySelector('#lhBoard')).transform === 'none',
    { timeout: 2000, interval: 30 },
  )
    .then(() => true)
    .catch(() => false);
  check(flatSettled, 'flat board has no transform');
  check(
    await page.evaluate(
      () => getComputedStyle(document.querySelector('#lhBoardDice')).perspective === 'none',
    ),
    'flat view keeps the board die',
  );
  await page.click('[data-act="view"]');
  check(
    !(await page.evaluate(() => document.querySelector('#lhRoot').classList.contains('flat'))),
    '3D toggle returns',
  );
  await page.click('[data-act="new"]');
  await page.waitForSelector('#lhSetup:not([hidden])');
  check(
    await page.evaluate(() => Boolean(document.querySelector('[data-act="close-setup"]'))),
    'in-match setup offers a close button',
  );
  await page.click('[data-act="close-setup"]');
  await waitFor(page, () => document.querySelector('#lhSetup').hidden, { timeout: 4000 });
  check((await page.evaluate(() => window.__ludo.phase())) === 'rolling', 'closing setup resumes play');

  console.log('\n— mobile —');
  const m = await browser.newPage();
  await m.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const mErrors = [];
  m.on('pageerror', (e) => mErrors.push(e.message));
  await m.goto(GAME, { waitUntil: 'networkidle0' });
  await m.evaluate(() => localStorage.clear());
  await m.reload({ waitUntil: 'networkidle0' });
  await m.waitForSelector('.lh-setupcard');
  await m.tap('#lhStart');
  await waitFor(m, () => window.__ludo.phase() === 'rolling', { timeout: 6000 });
  await m.evaluate(() => {
    window.__ludo.speed(0);
    window.__ludo.queue(6);
  });
  await m.tap('#lhRoll');
  await waitFor(m, () => window.__ludo.phase() === 'choosing', { timeout: 5000 });
  await m.tap('.lh-token.can-move');
  await waitFor(m, () => !window.__ludo.busy(), { timeout: 6000 });
  s = await state(m);
  check(
    s.players[0].tokens.some((t) => t === 0),
    'touch roll and tap move a marble',
  );
  const mInfo = await m.evaluate(() => ({
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    toolsFit:
      document.querySelector('.lh-tools').scrollWidth <= document.querySelector('.lh-tools').clientWidth + 1,
    roll: document.querySelector('#lhRoll').getBoundingClientRect().width,
    board: document.querySelector('#lhField').getBoundingClientRect().width,
  }));
  check(!mInfo.overflow, 'no horizontal overflow at 390px');
  check(mInfo.toolsFit, 'tool buttons all visible at 390px');
  check(mInfo.roll >= 250, 'roll button is a full-width thumb target', String(Math.round(mInfo.roll)));
  await m.screenshot({ path: path.join(OUT, 'ludo-qa-08-mobile.png') });
  check(mErrors.length === 0, 'no page errors on mobile');

  console.log('\n— launcher —');
  const l = await browser.newPage();
  await l.setViewport({ width: 1280, height: 950 });
  await l.goto(LAUNCHER, { waitUntil: 'networkidle0' });
  await l.waitForSelector('.gcard');
  const cards = await l.evaluate(() =>
    [...document.querySelectorAll('.gcard')].map((c) => c.querySelector('h3')?.textContent),
  );
  check(cards.length === 6, 'launcher shows six games', String(cards.length));
  check(cards.includes('Ludo Himalaya'), 'launcher includes Ludo Himalaya');
  await l.screenshot({ path: path.join(OUT, 'ludo-qa-09-launcher.png') });
  const ludoCard = await l.evaluateHandle(() =>
    [...document.querySelectorAll('.gcard')].find((c) => c.textContent.includes('Ludo Himalaya')),
  );
  await ludoCard.asElement().click();
  await l.waitForSelector('.lh-setupcard', { timeout: 8000 });
  check(
    (await l.evaluate(() => document.querySelector('#gvTitle').textContent)).includes('Ludo'),
    'launcher opens the game view',
  );
  const lb = await l.evaluate(() => ({
    cover: document.querySelector('#gvTitle').textContent,
    pills: [...document.querySelectorAll('.gamebar-meta .pill')].map((p) => p.textContent),
  }));
  check(
    lb.pills.some((p) => /3D/.test(p)),
    'game bar shows the 3D tag',
  );
  check(await l.evaluate(() => !document.querySelector('#lhSetup').hidden), 'deep link opens match setup');

  console.log('\n— console —');
  check(errors.length === 0, 'no console or page errors', errors.slice(0, 3).join(' | '));

  console.log(`\nLudo QA: ${pass} passed, ${fail} failed`);
  if (failures.length) console.log('Failed:', failures.join('; '));
  await browser.close();
  process.exit(fail ? 1 : 0);
})().catch((err) => {
  console.error('QA crashed:', err);
  process.exit(2);
});
