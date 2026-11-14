#!/usr/bin/env node
/* Research Facebook-promotion QA: proves the links are real, safe and rendered. */
const puppeteer = require('puppeteer');
const BASE = process.env.LK_BASE || 'http://127.0.0.1:8140';
const FB = 'https://www.facebook.com/profile.php?id=61586303026922';

let pass = 0; const fails = [];
const check = (ok, name, d = '') => { ok ? (pass++, console.log(`  ok  ${name}`)) : (fails.push(name), console.log(`FAIL  ${name}${d ? ' — ' + d : ''}`)); };

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--disable-features=CalculateNativeWinOcclusion'] });
  const page = await browser.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error' && !/WebGL|THREE/i.test(m.text())) errs.push(m.text().slice(0, 120)); });
  page.on('pageerror', (e) => { const m = String(e.message); if (!/WebGL|THREE/i.test(m)) errs.push(m.slice(0, 120)); });
  await page.evaluateOnNewDocument(() => { try { localStorage.setItem('act_welcomed', '1'); localStorage.setItem('act_consent', JSON.stringify({ necessary: true, analytics: false, personalization: false })); } catch {} });
  await page.setViewport({ width: 1440, height: 900 });

  await page.goto(`${BASE}/research`, { waitUntil: 'networkidle0', timeout: 120000 });

  console.log('\nFACEBOOK LINKS');
  const links = await page.$$eval('a[href*="facebook.com"]', (as) => as.map((a) => ({ href: a.href, target: a.target, rel: a.rel, text: a.textContent.trim().slice(0, 40) })));
  check(links.length >= 2, `research page links to Facebook (${links.length} links)`);
  check(links.every((l) => l.href === FB), 'every Facebook link points at the exact page URL', links.map((l) => l.href).join(' | '));
  check(links.every((l) => l.target === '_blank'), 'links open in a new tab');
  check(links.every((l) => /noopener/.test(l.rel) && /noreferrer/.test(l.rel)), 'links carry rel="noopener noreferrer"');

  console.log('\nHERO + CONNECT BAND');
  check(await page.$('a.btn-fb') !== null, 'hero has a styled Follow-on-Facebook button');
  check(await page.$('#connect') !== null, 'the Community & Contact band is present');
  const bandText = await page.$eval('#connect', (el) => el.textContent);
  check(bandText.includes('Thesyn Research'), 'band names the page');
  check(bandText.includes('Kathmandu'), 'band shows the location');
  check(bandText.includes('Your Trusted Partner for Thesis'), 'band shows the real page tagline');
  check(bandText.includes('9802336200'), 'band shows the WhatsApp/phone number');
  check(bandText.includes('thesynresearch@gmail.com'), 'band shows the email');
  const wa = await page.$eval('a[href*="wa.me"]', (a) => a.href);
  check(wa === 'https://wa.me/9779802336200', 'WhatsApp link uses the correct country code', wa);

  console.log('\nSCHEMA + FOOTER');
  const home = await page.goto(`${BASE}/`, { waitUntil: 'networkidle0', timeout: 120000 }).then(() => page.content());
  check(home.includes(FB.replace(/&/g, '&amp;')) || home.includes(FB), 'footer links the Facebook page');
  check(/"sameAs":\[[^\]]*facebook\.com[^\]]*\]/.test(home), 'Organization sameAs includes the Facebook page');

  console.log('\nMOBILE');
  await page.setViewport({ width: 390, height: 844 });
  await page.goto(`${BASE}/research`, { waitUntil: 'networkidle0', timeout: 120000 });
  const of390 = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check(of390 <= 0, `390px no horizontal overflow (${of390}px)`);
  await page.setViewport({ width: 320, height: 700 });
  await page.goto(`${BASE}/research`, { waitUntil: 'networkidle0', timeout: 120000 });
  const of320 = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check(of320 <= 0, `320px no horizontal overflow (${of320}px)`);

  console.log('\nCONSOLE');
  check(errs.length === 0, 'no console errors', errs.join(' | '));

  console.log(`\n${pass} passed, ${fails.length} failed`);
  if (fails.length) process.exitCode = 1;
  await browser.close();
})();