const puppeteer = require('puppeteer');
const path = require('path');
const OUT = path.join(__dirname, '..', '.shots');
const URL = 'http://127.0.0.1:8130/arcade/index.html?game=ludo-himalaya&ludoTest=1';
(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'],
  });
  for (const [w, h] of [
    [390, 844],
    [320, 700],
  ]) {
    const page = await browser.newPage();
    await page.setViewport({ width: w, height: h, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(URL, { waitUntil: 'networkidle0' });
    await page.waitForSelector('.lh-setupcard');
    await page.screenshot({ path: path.join(OUT, `ludo-m-${w}-setup.png`) });
    await page.evaluate(() =>
      window.__ludo.start({ players: 4, mode: 'human', options: { threeSixes: true } }),
    );
    await new Promise((r) => setTimeout(r, 500));
    const info = await page.evaluate(() => {
      const de = document.documentElement;
      const b = document.querySelector('#lhBoard').getBoundingClientRect();
      const btn = document.querySelector('#lhRoll').getBoundingClientRect();
      return {
        board: { w: Math.round(b.width), h: Math.round(b.height), x: Math.round(b.x), y: Math.round(b.y) },
        roll: { w: Math.round(btn.width), h: Math.round(btn.height), y: Math.round(btn.y) },
        scrollW: de.scrollWidth,
        clientW: de.clientWidth,
        scrollH: de.scrollHeight,
        wrap: Math.round(document.querySelector('#lhRoot').getBoundingClientRect().height),
        toolScroll: (() => {
          const t = document.querySelector('.lh-tools');
          return [t.scrollWidth, t.clientWidth];
        })(),
      };
    });
    console.log(w, JSON.stringify(info), errors.length ? errors : 'ok');
    await page.screenshot({ path: path.join(OUT, `ludo-m-${w}-board.png`), fullPage: false });
    await page.close();
  }
  await browser.close();
})();
