// Capture the deck CTA row (Loksewa / offer / guide) to verify button affordance.
const puppeteer = require('puppeteer');
const BASE = process.env.DECK_BASE || 'http://127.0.0.1:8140';
const OUT = 'C:/Users/acttolog/AppData/Local/arcadeqa/full';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-angle=swiftshader',
      '--disable-features=CalculateNativeWinOcclusion', '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'],
  });
  const page = await browser.newPage();
  await page.evaluateOnNewDocument(() => { try { localStorage.setItem('act_welcomed', '1'); localStorage.setItem('act_consent', JSON.stringify({ necessary: true })); } catch {} });
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(BASE + '/', { waitUntil: 'networkidle2', timeout: 120000 });
  await sleep(1000);
  await page.evaluate(() => document.querySelector('.dk-f')?.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await sleep(900);
  await page.screenshot({ path: OUT + '/vp-deck-cta.png' });
  console.log('wrote vp-deck-cta.png');
  await browser.close();
})();