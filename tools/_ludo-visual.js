const puppeteer = require('puppeteer');
const path = require('path');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--enable-unsafe-swiftshader',
      '--use-angle=swiftshader',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
    ],
  });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await page.setViewport({ width: 1280, height: 950 });
  await page.goto('http://127.0.0.1:8130/arcade/index.html?game=ludo-himalaya&ludoTest=1', {
    waitUntil: 'networkidle0',
  });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle0' });
  await page.evaluate(() => window.__ludo.start({ players: 4, mode: 'human' }));
  await sleep(300);
  await page.evaluate(() => {
    const put = (c, i, p) => window.__ludo.setToken(c, i, p);
    put('red', 0, 9);
    put('red', 1, 55);
    put('red', 2, 30);
    put('green', 0, 21);
    put('green', 1, 47);
    put('yellow', 0, 36);
    put('yellow', 1, 12);
    put('blue', 0, 4);
    put('blue', 1, 44);
    window.__ludo.setTurn(0);
  });
  await sleep(300);
  await page.screenshot({ path: path.join('.shots', 'ludo-v2-rest.png') });
  await page.evaluate(() => {
    window.__ludo.speed(null);
    window.__ludo.queue(5);
    window.__ludo.roll();
  });
  await sleep(420);
  await page.screenshot({ path: path.join('.shots', 'ludo-v2-throw.png') });
  await sleep(2600);
  await page.screenshot({ path: path.join('.shots', 'ludo-v2-settled.png') });
  console.log('phase', await page.evaluate(() => window.__ludo.phase()));
  console.log('errors', errors);
  const m = await browser.newPage();
  await m.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await m.goto('http://127.0.0.1:8130/arcade/index.html?game=ludo-himalaya&ludoTest=1', {
    waitUntil: 'networkidle0',
  });
  await m.evaluate(() => localStorage.clear());
  await m.reload({ waitUntil: 'networkidle0' });
  await m.evaluate(() => window.__ludo.start({ players: 4, mode: 'human' }));
  await sleep(400);
  await m.screenshot({ path: path.join('.shots', 'ludo-v2-mobile.png') });
  await browser.close();
})();
