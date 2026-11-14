#!/usr/bin/env node
/* Preview shots of the research Facebook promotion (hero CTA + connect band). */
const fs = require('node:fs');
const path = require('node:path');
const puppeteer = require('puppeteer');

const BASE = process.env.LK_BASE || 'http://127.0.0.1:3100';
const OUT = path.join(__dirname, '..', '.shots', 'rsc');

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--disable-features=CalculateNativeWinOcclusion',
      '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.evaluateOnNewDocument(() => {
    try {
      localStorage.setItem('act_welcomed', '1');
      localStorage.setItem('act_consent', JSON.stringify({ necessary: true, analytics: false, personalization: false }));
    } catch {}
  });

  await page.goto(`${BASE}/research`, { waitUntil: 'networkidle0', timeout: 120000 });
  await new Promise((r) => setTimeout(r, 2200));
  await page.screenshot({ path: path.join(OUT, 'research-hero.png') });

  await page.evaluate(() => document.querySelector('#connect')?.scrollIntoView({ block: 'start' }));
  await new Promise((r) => setTimeout(r, 2200));
  await page.screenshot({ path: path.join(OUT, 'research-connect.png') });

  await page.setViewport({ width: 390, height: 844 });
  await page.goto(`${BASE}/research`, { waitUntil: 'networkidle0', timeout: 120000 });
  await page.evaluate(() => document.querySelector('#connect')?.scrollIntoView({ block: 'start' }));
  await new Promise((r) => setTimeout(r, 2200));
  await page.screenshot({ path: path.join(OUT, 'research-connect-mobile.png') });

  console.log('shots:', fs.readdirSync(OUT).join(', '));
  await browser.close();
})();