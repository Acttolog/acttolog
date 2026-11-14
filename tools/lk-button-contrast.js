#!/usr/bin/env node
/*
 * Pixel-level contrast for the button surfaces the CSS probe cannot resolve
 * (gradient backgrounds). Screenshots the element, then separates ink from
 * surface by luminance and reports the WCAG ratio of the real pixels.
 *
 *   LK_BASE=http://127.0.0.1:3100 node tools/lk-button-contrast.js
 */
const puppeteer = require('puppeteer');
const sharp = require('sharp');

const BASE = process.env.LK_BASE || 'http://127.0.0.1:3100';
const TARGETS = [
  ['/loksewa/downloads', '.lkd-hero-cta .btn-p', 'primary download CTA'],
  ['/loksewa/downloads', '.lkd-card .btn-p', 'card download button'],
  ['/loksewa/downloads', '.lkd-pack .btn-p', 'pack order button'],
  ['/loksewa/downloads', '.lkd-card .btn-sm:not(.btn-p)', 'secondary open/print button'],
  ['/loksewa/explorer', '.lx-actions .btn-p', 'explorer download button'],
  ['/loksewa/explorer', '.lx-open', 'explorer node open button'],
  ['/loksewa/print/planner', '.lkdoc-bar .btn-p', 'print bar PDF button'],
];

const lum = (r, g, b) => {
  const f = (v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--disable-features=CalculateNativeWinOcclusion'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 950, deviceScaleFactor: 2 });

  let worst = 99;
  for (const [url, sel, label] of TARGETS) {
    await page.goto(`${BASE}${url}`, { waitUntil: 'networkidle0', timeout: 120000 });
    await new Promise((r) => setTimeout(r, 1500));
    const el = await page.$(sel);
    if (!el) {
      console.log(`  ? ${label.padEnd(30)} — selector not found (${sel})`);
      continue;
    }
    await el.scrollIntoView();
    await new Promise((r) => setTimeout(r, 400));
    const buf = await el.screenshot();
    const { data, info } = await sharp(buf).raw().toBuffer({ resolveWithObject: true });
    const L = [];
    for (let i = 0; i < data.length; i += info.channels) L.push(lum(data[i], data[i + 1], data[i + 2]));
    L.sort((a, b) => a - b);
    // ink = the darkest 8% (light text) or brightest 8% (dark text); surface = the median
    const n = L.length;
    const surface = L[Math.floor(n * 0.5)];
    const inkDark = L[Math.floor(n * 0.02)];
    const inkLight = L[Math.floor(n * 0.98)];
    const r1 = ratio(surface, inkDark);
    const r2 = ratio(surface, inkLight);
    const best = Math.max(r1, r2);
    const which = r1 > r2 ? 'light ink' : 'dark ink';
    worst = Math.min(worst, best);
    console.log(
      `  ${best.toFixed(2).padStart(6)} : 1  ${which.padEnd(10)} ${label}  (surface L=${surface.toFixed(3)})`,
    );
  }
  await browser.close();
  console.log(`\nworst measured button contrast: ${worst.toFixed(2)}:1  (WCAG AA for UI text: 4.5:1)`);
})().catch((e) => {
  console.error('LK BUTTON CONTRAST CRASHED:', e);
  process.exit(1);
});
