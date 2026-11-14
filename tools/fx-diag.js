// Console + network audit of the motion build: scrolls the whole page, reports
// every console message and failed request, and checks the fx actually armed.
const puppeteer = require('puppeteer');

const BASE = process.env.FX_BASE || 'http://127.0.0.1:8140';

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--disable-features=CalculateNativeWinOcclusion',
      '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  const msgs = [];
  const failed = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') msgs.push(`${m.type()}: ${m.text().slice(0, 180)}`); });
  page.on('pageerror', (e) => msgs.push(`pageerror: ${String(e).slice(0, 180)}`));
  page.on('requestfailed', (r) => failed.push(`${r.url().slice(0, 120)} ${r.failure()?.errorText}`));

  await page.evaluateOnNewDocument(() => { try { localStorage.setItem('act_welcomed', '1'); localStorage.setItem('act_consent', JSON.stringify({ necessary: true, analytics: false, personalization: false })); } catch { /* noop */ } });
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle0', timeout: 120000 });
  await new Promise((r) => setTimeout(r, 2500));

  const armed = await page.evaluate(() => ({
    fxOn: document.documentElement.classList.contains('fx-on'),
    tilt: document.querySelectorAll('.fx-tilt').length,
    holo: document.querySelectorAll('.fx-holo').length,
    kb: document.querySelectorAll('.fx-kb').length,
    planes: document.querySelectorAll('[data-plane]').length,
    scanBars: document.querySelectorAll('.fx-scan-bar').length,
    flipped: [...document.querySelectorAll('[data-fx~="flip"]')].map((e) => getComputedStyle(e).transform.slice(0, 34)),
  }));

  // scroll the whole page so every trigger fires
  const h = await page.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < h; y += 700) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await new Promise((r) => setTimeout(r, 130));
  }
  await new Promise((r) => setTimeout(r, 1800));

  const after = await page.evaluate(() => {
    const els = [...document.querySelectorAll('[data-fx~="scan"], [data-fx~="flip"]')];
    return {
      total: els.length,
      rows: els.map((el) => {
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        const img = el.querySelector('img');
        const ics = img ? getComputedStyle(img) : null;
        const sec = el.closest('section')?.id || '(no section)';
        return {
          sec,
          fx: el.getAttribute('data-fx'),
          revealed: el.classList.contains('in'),
          elOpacity: cs.opacity,
          elTransform: cs.transform.slice(0, 28),
          imgClip: ics ? ics.clipPath : 'no img',
          imgOpacity: ics ? ics.opacity : '-',
          rectTop: Math.round(r.top),
          rectH: Math.round(r.height),
        };
      }),
    };
  });

  // reel on /nepal
  await page.goto(`${BASE}/nepal`, { waitUntil: 'networkidle0', timeout: 120000 });
  await new Promise((r) => setTimeout(r, 2500));
  const reelState = await page.evaluate(() => {
    const cells = [...document.querySelectorAll('.fx-reel-cell')];
    const st = document.querySelector('.fx-reel-stage');
    return {
      cells: cells.length,
      stage: st ? getComputedStyle(st).perspective : 'MISSING',
      staticFallback: Boolean(document.querySelector('.fx-reel-static')),
      visibleCredits: [...document.querySelectorAll('.fx-reel-c')].filter((e) => e.innerText.trim().length > 3).length,
      navButtons: document.querySelectorAll('.fx-reel-nav button').length,
    };
  });

  await browser.close();
  console.log('FX ARMED:', JSON.stringify(armed, null, 1));
  console.log('AFTER SCROLL:', JSON.stringify(after, null, 1));
  console.log('REEL:', JSON.stringify(reelState, null, 1));
  console.log('CONSOLE (' + msgs.length + '):'); msgs.slice(0, 12).forEach((m) => console.log('  ' + m));
  console.log('FAILED REQUESTS (' + failed.length + '):'); failed.slice(0, 8).forEach((f) => console.log('  ' + f));
})().catch((e) => { console.error('DIAG FAILED:', e.message); process.exit(1); });
