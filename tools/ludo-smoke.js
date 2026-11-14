// Quick visual smoke for Ludo Himalaya — not part of the shipped site.
const puppeteer = require('puppeteer');
const path = require('path');

const OUT = path.join(__dirname, '..', '.shots');
const URL = 'http://127.0.0.1:8130/arcade/index.html?game=ludo-himalaya&ludoTest=1';

(async () => {
  const fs = require('fs');
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--window-size=1366,1050'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 1050, deviceScaleFactor: 1 });
  const errors = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(`PAGEERROR ${e.message}`));
  await page.goto(URL, { waitUntil: 'networkidle0', timeout: 45000 });
  await page.waitForSelector('.lh-setupcard', { timeout: 10000 });
  await page.evaluate(() =>
    document.querySelector('#lhSetup').scrollIntoView({ block: 'center', behavior: 'instant' }),
  );
  await page.screenshot({ path: path.join(OUT, 'ludo-01-setup.png') });

  await page.click('#lhStart');
  await new Promise((r) => setTimeout(r, 700));
  await page.evaluate(() => window.__ludo.speed(30));
  const info = await page.evaluate(() => {
    const s = window.__ludo.state();
    const b = document.querySelector('#lhBoard').getBoundingClientRect();
    const f = document.querySelector('#lhField').getBoundingClientRect();
    const sel = (s) => document.querySelectorAll(s).length;
    return {
      phase: s.phase,
      players: s.players.map((p) => `${p.color}:${p.type}`),
      board: { w: Math.round(b.width), h: Math.round(b.height) },
      field: { w: Math.round(f.width), h: Math.round(f.height) },
      cells: sel('.lh-cell'),
      tokens: sel('.lh-token'),
      sockets: sel('.lh-socket'),
      homes: sel('.lh-home'),
      diceFaces: sel('.lh-face'),
      marks: sel('.lh-mark'),
      wrap: document.querySelector('#lhRoot').getBoundingClientRect().height,
      scroll: document.documentElement.scrollHeight,
    };
  });
  console.log('INFO', JSON.stringify(info, null, 2));
  await page.screenshot({ path: path.join(OUT, 'ludo-02-board.png') });

  await page.evaluate(() => window.__ludo.roll(6));
  await page.waitForFunction(() => window.__ludo.phase() === 'choosing', { timeout: 5000 });
  await new Promise((r) => setTimeout(r, 250));
  await page.screenshot({ path: path.join(OUT, 'ludo-03-choosing.png') });
  const choosing = await page.evaluate(() => ({
    phase: window.__ludo.phase(),
    dice: window.__ludo.state().dice,
    marks: document.querySelectorAll('.lh-mark').length,
    movable: document.querySelectorAll('.lh-token.can-move').length,
  }));
  console.log('CHOOSING', JSON.stringify(choosing));

  await page.evaluate(() => window.__ludo.pick(0));
  await new Promise((r) => setTimeout(r, 900));
  const afterMove = await page.evaluate(() => {
    const s = window.__ludo.state();
    return { phase: s.phase, turn: s.turn, tokens: s.players.map((p) => p.tokens.join(',')) };
  });
  console.log('AFTER MOVE', JSON.stringify(afterMove));
  await page.screenshot({ path: path.join(OUT, 'ludo-04-moved.png') });
  console.log('ERRORS', errors.length ? errors : 'none');
  await browser.close();
})();
