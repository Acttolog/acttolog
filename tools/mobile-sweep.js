/**
 * Mobile overflow sweep — every route at 390 and 320 px.
 * Usage: node tools/mobile-sweep.js [base-url]
 */
const puppeteer = require('puppeteer');
const BASE = process.argv[2] || 'https://acttolog.github.io';
const ROUTES = ['/', '/nepal', '/explore', '/search?q=pokhara', '/offers', '/about', '/contact', '/my', '/my/saved', '/my/settings', '/games', '/academy'];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const b = await puppeteer.launch({ headless: 'shell', args: ['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader'] });
  let bad = 0;
  for (const width of [390, 320]) {
    for (const route of ROUTES) {
      const p = await b.newPage();
      await p.setViewport({ width, height: 844 });
      await p.evaluateOnNewDocument(() => {
        try {
          localStorage.setItem('act_consent', JSON.stringify({ necessary: true, analytics: false, personalization: false }));
          localStorage.setItem('act_welcomed', '1');
        } catch {}
      });
      try {
        await p.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 90000 });
        await sleep(route === '/' || route.startsWith('/explore') ? 6500 : 4000);
        const r = await p.evaluate(() => {
          const de = document.documentElement;
          const over = de.scrollWidth - de.clientWidth;
          const vw = de.clientWidth;
          const offenders = [];
          if (over > 1) {
            for (const el of document.querySelectorAll('body *')) {
              const b = el.getBoundingClientRect();
              if (b.width && b.right > vw + 1 && b.left < vw) {
                const cls = typeof el.className === 'string' ? el.className.slice(0, 60) : '';
                offenders.push(`${el.tagName.toLowerCase()}.${cls}`.slice(0, 90));
                if (offenders.length >= 5) break;
              }
            }
          }
          return { over, offenders };
        });
        const ok = r.over <= 1;
        if (!ok) bad++;
        console.log(`${ok ? 'PASS' : 'FAIL'}  ${width}px ${route}  over=${r.over}${r.offenders.length ? '  ' + r.offenders.join(' | ') : ''}`);
      } catch (e) {
        bad++;
        console.log(`ERR   ${width}px ${route}  ${e.message.slice(0, 80)}`);
      }
      await p.close();
    }
  }
  await b.close();
  console.log(`\n${24 - bad}/24 clean`);
  if (bad) process.exit(1);
})().catch((e) => { console.error(e); process.exit(1); });
