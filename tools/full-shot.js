// Full-page + key-viewport capture of the harvested homepage for holistic review.
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const BASE = process.env.HOME_BASE || 'http://127.0.0.1:8140';
const OUT = 'C:/Users/acttolog/AppData/Local/arcadeqa/full';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.evaluateOnNewDocument(() => {
    try {
      localStorage.setItem('act_welcomed', '1');
      localStorage.setItem('act_consent', 'necessary');
    } catch {}
  });
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle0', timeout: 90000 });
  await sleep(1200);
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('#consent button')].find((b) =>
      /necessary only/i.test(b.textContent || ''),
    );
    if (btn) btn.click();
    const card = document.querySelector('.fv-card');
    if (card) {
      const b = [...card.querySelectorAll('button')].find((x) => /skip|स्किप/i.test(x.textContent || ''));
      if (b) b.click();
    }
  });
  await sleep(800);
  // Force every reveal visible so the full-page stitch is not blank below fold.
  await page.evaluate(() => document.querySelectorAll('[data-rv]').forEach((el) => el.classList.add('in')));
  await sleep(500);
  const canvases = await page.evaluate(() => document.querySelectorAll('canvas').length);
  const heroH = await page.evaluate(() => document.getElementById('hero')?.getBoundingClientRect().height || 0);
  console.log('canvases:', canvases, 'heroH:', heroH);
  await page.screenshot({ path: path.join(OUT, 'full-desktop.png'), fullPage: true });
  console.log('wrote full-desktop.png');
  // Key viewports
  for (const [id, file] of [['hero', 'vp-hero.png'], ['deck', 'vp-deck.png'], ['signal', 'vp-signal.png'], ['studio', 'vp-studio.png']]) {
    await page.evaluate((sid) => document.getElementById(sid)?.scrollIntoView({ behavior: 'instant', block: 'start' }), id);
    await sleep(700);
    await page.evaluate(() => document.querySelectorAll('[data-rv]').forEach((el) => el.classList.add('in')));
    await sleep(300);
    await page.screenshot({ path: path.join(OUT, file) });
    console.log('wrote', file);
  }
  await browser.close();
})();