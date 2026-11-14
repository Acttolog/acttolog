// Measures homepage composition: total height, per-section heights, duplicate topics.
const puppeteer = require('puppeteer');

const BASE = process.env.HOME_BASE || 'https://acttolog.github.io';
const VP = { width: 1440, height: 900 };

(async () => {
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
  const page = await browser.newPage();
  await page.setViewport(VP);
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle0', timeout: 90000 });
  await page.evaluate(() => {
    localStorage.setItem('act_welcomed', '1');
    document.querySelector('#consent .btn-p, #consent button')?.click();
    document.querySelector('.fv-card .btn, .fv-card button')?.click();
  });
  await new Promise((r) => setTimeout(r, 1200));

  const audit = await page.evaluate(() => {
    const rect = document.documentElement.getBoundingClientRect();
    const ids = ['hero', 'descent', 'signal', 'index', 'nepal-promo', 'studio', 'cta'];
    const sections = [...document.querySelectorAll('section')].map((s) => ({
      id: s.id || '(none)',
      h: Math.round(s.getBoundingClientRect().height),
      links: s.querySelectorAll('a').length,
      words: (s.innerText || '').trim().split(/\s+/).filter(Boolean).length,
    }));
    return {
      viewport: innerHeight,
      body: document.body.scrollHeight,
      vh: +(document.body.scrollHeight / innerHeight).toFixed(1),
      sections,
      known: ids.map((id) => {
        const el = document.getElementById(id);
        return el ? { id, h: Math.round(el.getBoundingClientRect().height) } : { id, h: 0 };
      }),
      divisionMentions: ['research', 'darkroom', 'academy', 'games', 'entertainment'].reduce((a, k) => {
        a[k] = (document.body.innerText.match(new RegExp(k, 'gi')) || []).length;
        return a;
      }, {}),
    };
  });
  console.log(JSON.stringify(audit, null, 1));
  await browser.close();
})();
