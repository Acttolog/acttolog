/* Render a generated PDF's first page in Chrome's own PDF viewer and shoot it,
   so Devanagari glyph coverage is verified visually rather than assumed. */
const puppeteer = require('puppeteer');
const path = require('node:path');

const target = process.argv[2] || 'full.pdf';
const out = process.argv[3] || path.join(__dirname, '..', '.shots', 'pdf-' + target.replace('.pdf', '') + '.png');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-features=CalculateNativeWinOcclusion', '--pdf-text-outline=0'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1000, height: 1280 });
  const file = 'file:///' + path.join(__dirname, '..', 'public', 'loksewa', 'dl', target).replace(/\\/g, '/');
  await page.goto(file, { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 2500));
  await page.screenshot({ path: out });
  await browser.close();
  console.log(out);
})();
