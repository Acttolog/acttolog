// Finds the LCP element and resource weight on the homepage, desktop + throttled mobile.
const puppeteer = require('puppeteer');

const BASE = process.env.SEO_BASE || 'https://acttolog.github.io';

async function pass(label, vp, cpuThrottle, blockFonts) {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--disable-features=CalculateNativeWinOcclusion',
      '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'],
  });
  const page = await browser.newPage();
  await page.setViewport({ ...vp, deviceScaleFactor: 1 });
  const client = await page.createCDPSession();
  if (blockFonts) {
    await page.setRequestInterception(true);
    page.on('request', (r) => (/\.woff2?(\?|$)/i.test(r.url()) ? r.abort() : r.continue()));
  }
  if (cpuThrottle) await client.send('Emulation.setCPUThrottlingRate', { rate: cpuThrottle });
  await page.evaluateOnNewDocument(() => {
    window.__lcp = [];
    try {
      new PerformanceObserver((l) => {
        l.getEntries().forEach((e) => {
          window.__lcp.push({
            t: e.startTime,
            el: e.element ? e.element.tagName.toLowerCase() + (e.element.id ? '#' + e.element.id : '') : 'text',
            src: (e.url || '').split('/').pop(),
            size: e.size,
          });
        });
      }).observe({ type: 'largest-contentful-paint', buffered: true });
    } catch { /* noop */ }
  });
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle0', timeout: 120000 });
  await page.evaluate(() => { try { localStorage.setItem('act_welcomed', '1'); } catch { /* noop */ } document.querySelector('#consent button')?.click(); });
  await new Promise((r) => setTimeout(r, 2500));

  const data = await page.evaluate(() => {
    const lcp = window.__lcp || [];
    const last = lcp[lcp.length - 1];
    const nav = performance.getEntriesByType('navigation')[0] || {};
    const res = performance.getEntriesByType('resource');
    const byType = {};
    res.forEach((r) => { const t = r.initiatorType || 'other'; byType[t] = byType[t] || { n: 0, bytes: 0 }; byType[t].n++; byType[t].bytes += r.transferSize || 0; });
    const slowest = [...res].sort((a, b) => b.duration - a.duration).slice(0, 6).map((r) => `${Math.round(r.duration)}ms ${(r.transferSize / 1024) | 0}KB ${r.name.split('/').slice(-2).join('/')}`);
    return {
      lcpFinal: last ? Math.round(last.t) : null,
      lcpEl: last ? `${last.el} ${last.src || ''} ${(last.size / 1024) | 0}KB` : 'not captured',
      lcpCount: lcp.length,
      fcp: Math.round((performance.getEntriesByType('paint').find((p) => p.name === 'first-contentful-paint') || {}).startTime || 0),
      domReady: Math.round(nav.domContentLoadedEventEnd || 0),
      load: Math.round(nav.loadEventEnd || 0),
      ttfb: Math.round(nav.responseStart || 0),
      byType,
      slowest,
      totalBytes: res.reduce((a, r) => a + (r.transferSize || 0), 0) + (nav.transferSize || 0),
    };
  });
  await browser.close();
  return { label, vp: `${vp.width}x${vp.height}`, cpu: cpuThrottle || 1, ...data };
}

(async () => {
  const rows = [];
  rows.push(await pass('desktop', { width: 1440, height: 900 }, 0, false));
  rows.push(await pass('desktop, webfonts blocked', { width: 1440, height: 900 }, 0, true));
  rows.push(await pass('mobile 4x CPU', { width: 390, height: 844 }, 4, false));
  const fmt = (r) => `${r.label} (${r.vp}, cpu ${r.cpu}x)\n  LCP ${r.lcpFinal}ms  element: ${r.lcpEl}\n  FCP ${r.fcp}ms  TTFB ${r.ttfb}ms  DOM ${r.domReady}ms  load ${r.load}ms\n  transfer ${(r.totalBytes / 1048576).toFixed(2)} MB\n  by type: ${Object.entries(r.byType).map(([k, v]) => `${k}:${(v.bytes / 1024) | 0}KB/${v.n}`).join('  ')}\n  slowest: ${r.slowest.join(' | ')}`;
  rows.forEach((r) => console.log(fmt(r)));
})().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
