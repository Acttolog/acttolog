// Captures the post-descent homepage sections for visual review.
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const BASE = process.env.HOME_BASE || 'http://127.0.0.1:8140';
const OUT = path.join(__dirname, '..', '.shots');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function shot(page, file, timeout = 50000) {
  const ok = await Promise.race([
    page.screenshot({ path: path.join(OUT, file) }).then(
      () => true,
      () => false,
    ),
    sleep(timeout).then(() => false),
  ]);
  if (!ok) console.log(`skipped ${file}`);
  else console.log(`wrote ${file}`);
}

async function ready(page) {
  await page.waitForSelector('#consent', { timeout: 15000 }).catch(() => {});
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('#consent button')].find((b) =>
      /necessary only/i.test(b.textContent || ''),
    );
    if (btn) btn.click();
  });
  await sleep(600);
  const modal = await page.evaluate(() => Boolean(document.querySelector('.fv-card')));
  if (modal) {
    await page.evaluate(() => {
      const card = document.querySelector('.fv-card');
      const btn =
        card && [...card.querySelectorAll('button')].find((b) => /skip|स्किप/i.test(b.textContent || ''));
      if (btn) btn.click();
    });
    await sleep(400);
  }
}

async function capture(browser, viewport, tag) {
  const page = await browser.newPage();
  await page.setViewport(viewport);
  await page.evaluateOnNewDocument(() => {
    try {
      localStorage.setItem('act_welcomed', '1');
    } catch {
      /* private mode */
    }
  });
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle0', timeout: 90000 });
  await ready(page);
  for (const id of ['signal', 'index', 'nepal-promo', 'studio', 'cta']) {
    await page.evaluate((sid) => {
      const el = document.getElementById(sid);
      el?.scrollIntoView({ behavior: 'instant', block: 'start' });
    }, id);
    await sleep(700);
    await page.evaluate(() => {
      document.querySelectorAll('[data-rv]').forEach((el) => el.classList.add('in'));
    });
    await sleep(300);
    await shot(page, `home-${tag}-${id}.png`);
  }
  await page.close();
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
  await capture(browser, { width: 1440, height: 900 }, 'desk');
  await capture(
    browser,
    { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
    'mob',
  );
  await browser.close();
})();
