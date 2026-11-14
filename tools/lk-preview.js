#!/usr/bin/env node
/*
 * Preview shots for the Loksewa download centre, explorer and print sheets.
 * Written for the owner's accept-before-deploy gate: one image per surface,
 * plus the print media emulation so the paper result is visible on screen.
 *
 *   LK_BASE=http://127.0.0.1:3100 node tools/lk-preview.js
 */
const fs = require('node:fs');
const path = require('node:path');
const puppeteer = require('puppeteer');

const BASE = process.env.LK_BASE || 'http://127.0.0.1:3100';
const OUT = path.join(__dirname, '..', '.shots', 'lkp');

const seed = () => {
  try {
    localStorage.setItem('act_welcomed', '1');
    localStorage.setItem('act_consent', JSON.stringify({ necessary: true, analytics: false, personalization: false }));
  } catch { /* private mode */ }
};

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--disable-features=CalculateNativeWinOcclusion',
      '--disable-background-timer-throttling', '--disable-renderer-backgrounding'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 950 });
  await page.evaluateOnNewDocument(seed);

  const shot = async (name, opts = {}) => {
    await new Promise((r) => setTimeout(r, opts.wait || 1800));
    if (opts.scroll) {
      await page.evaluate((sel) => document.querySelector(sel)?.scrollIntoView({ block: 'start' }), opts.scroll);
      await new Promise((r) => setTimeout(r, 900));
    }
    await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: Boolean(opts.full) });
    console.log(`${name}.png`);
  };

  await page.goto(`${BASE}/loksewa/downloads`, { waitUntil: 'networkidle0', timeout: 120000 });
  await shot('downloads-hero');
  await shot('downloads-free', { scroll: '#lkd-free' });
  await shot('downloads-video', { scroll: '#lkd-video' });
  await shot('downloads-paid', { scroll: '#lkd-paid' });

  await page.goto(`${BASE}/loksewa/explorer`, { waitUntil: 'networkidle0', timeout: 120000 });
  await shot('explorer-ring');
  await page.evaluate(() => document.querySelectorAll('.lx-open')[0]?.click());
  await shot('explorer-subjects', { wait: 1200 });
  await page.evaluate(() => document.querySelectorAll('.lx-plate .lx-open')[0]?.click());
  await shot('explorer-folders', { wait: 1200 });

  await page.goto(`${BASE}/loksewa/print/planner`, { waitUntil: 'networkidle0', timeout: 120000 });
  await shot('print-planner-screen');
  await page.emulateMediaType('print');
  await shot('print-planner-paper');
  await page.emulateMediaType('screen');

  await page.goto(`${BASE}/loksewa`, { waitUntil: 'networkidle0', timeout: 120000 });
  await shot('hub-promo', { scroll: '#lk-paper' });

  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  await page.goto(`${BASE}/loksewa/downloads`, { waitUntil: 'networkidle0', timeout: 120000 });
  await shot('downloads-mobile');
  await page.goto(`${BASE}/loksewa/explorer`, { waitUntil: 'networkidle0', timeout: 120000 });
  await shot('explorer-mobile');

  await browser.close();
  console.log(`\n${OUT}`);
})().catch((e) => {
  console.error('LK PREVIEW CRASHED:', e);
  process.exit(1);
});
