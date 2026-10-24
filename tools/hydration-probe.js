/**
 * Hydration mismatch capture — reads React's FULL unminified error text from
 * the harvested static artifact (the only surface where the mismatch appears;
 * `next start` renders per-request and hides it).
 *
 * Usage: node tools/hydration-probe.js [base-url]
 */
const puppeteer = require('puppeteer');
const BASE = process.argv[2] || 'http://127.0.0.1:3230';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    headless: 'shell',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  let total = 0;
  for (const path of ['/', '/nepal', '/darkroom']) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    const found = [];
    page.on('pageerror', (e) => found.push(String(e && e.message || e)));
    page.on('console', (m) => {
      if (m.type() === 'error') {
        const t = m.text();
        if (/hydrat|did not match|server|client|Text content/i.test(t)) found.push(t);
      }
    });
    try {
      await page.goto(BASE + path, { waitUntil: 'domcontentloaded', timeout: 60000 });
    } catch (e) {
      console.log(`\n### ${path}: NAV TIMEOUT ${String(e).slice(0, 80)}`);
      await page.close();
      continue;
    }
    await sleep(7000);
    const relevant = found.filter((x) => !/404|Failed to load resource|favicon/i.test(x));
    total += relevant.length;
    console.log(`\n### ${path} — ${relevant.length} hydration-related messages`);
    relevant.slice(0, 6).forEach((m, i) => {
      console.log(`--- [${i}] ---`);
      console.log(m.slice(0, 1800));
    });
    await page.close();
  }
  console.log(`\nTOTAL hydration messages: ${total}`);
  await browser.close();
  process.exit(0);
})().catch((e) => { console.error('PROBE ERROR', e); process.exit(2); });
