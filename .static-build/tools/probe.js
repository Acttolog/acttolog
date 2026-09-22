const puppeteer = require('puppeteer');
const http = require('http');

const head = (p) => new Promise((r) => {
  http.get({ host: '127.0.0.1', port: 3100, path: p }, (res) => {
    let n = 0; res.on('data', (d) => (n += d.length)); res.on('end', () => r(`${p} → ${res.statusCode} ${n}B`));
  }).on('error', (e) => r(`${p} → ERR ${e.message}`));
});

(async () => {
  console.log(await head('/textures/earth-day.jpg'));
  console.log(await head('/textures/earth-lights.jpg'));

  const browser = await puppeteer.launch({
    headless: 'shell',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  page.on('response', (r) => { if (r.url().includes('textures')) console.log('NET', r.status(), r.url().split('/').pop()); });
  page.on('requestfailed', (r) => { if (r.url().includes('textures')) console.log('NETFAIL', r.url(), r.failure() && r.failure().errorText); });
  page.on('pageerror', (e) => console.log('PAGEERR', String(e).slice(0, 200)));
  await page.goto('http://127.0.0.1:3100/', { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise((r) => setTimeout(r, 15000));
  const info = await page.evaluate(() => {
    const c = document.querySelector('#hero canvas');
    const h1 = document.querySelector('.htitle');
    const spans = h1 ? h1.querySelectorAll('span') : [];
    const s0 = spans[0] ? getComputedStyle(spans[0]) : null;
    const h1s = h1 ? getComputedStyle(h1) : null;
    return {
      canvas: Boolean(c),
      spanCount: spans.length,
      span0: s0 ? { opacity: s0.opacity, color: s0.color, clip: s0.webkitBackgroundClip || s0.backgroundClip, bgImg: s0.backgroundImage.slice(0, 50), bgClipParent: h1s ? (h1s.webkitBackgroundClip || h1s.backgroundClip) : null, parentColor: h1s ? h1s.color : null, parentBg: h1s ? h1s.backgroundImage.slice(0, 50) : null } : null,
    };
  });
  console.log('DOM:', JSON.stringify(info, null, 1));
  await browser.close();
})().catch((e) => { console.error('PROBE FAIL', e.message); process.exit(1); });
