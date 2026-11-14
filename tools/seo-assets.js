// Builds the SEO media set locally: WebP variants for the descent art, a 1200x630
// social card, and a 512px logo PNG. Uses Chromium's own encoders (no ffmpeg on this host).
const fs = require('node:fs');
const path = require('node:path');
const puppeteer = require('puppeteer');

const PUB = path.join(process.cwd(), 'public');
const DESCENT = ['research', 'darkroom', 'academy', 'entertainment', 'games'];
const Q = 0.82;

const b64 = (p) => fs.readFileSync(p).toString('base64');

async function toWebp(page, srcJpg, outWebp, maxWidth, q = Q) {
  const data = `data:image/jpeg;base64,${b64(srcJpg)}`;
  const b64out = await page.evaluate(async (src, quality, maxW) => {
    const img = new Image();
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = src; });
    const c = document.createElement('canvas');
    const scale = maxW && img.naturalWidth > maxW ? maxW / img.naturalWidth : 1;
    c.width = Math.round(img.naturalWidth * scale);
    c.height = Math.round(img.naturalHeight * scale);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    const url = c.toDataURL('image/webp', quality);
    if (!url.startsWith('data:image/webp')) throw new Error('webp encoding unsupported');
    return url.split(',')[1];
  }, data, q, maxWidth || 0);
  fs.writeFileSync(outWebp, Buffer.from(b64out, 'base64'));
  return { src: path.basename(srcJpg) + (maxWidth ? `@${maxWidth}` : ''), out: path.basename(outWebp), from: fs.statSync(srcJpg).size, to: fs.statSync(outWebp).size };
}

async function shot(page, html, out, w, h, opts = {}) {
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: 'load', timeout: 180000 });
  await page.screenshot({ path: out, ...opts });
  return { out: path.basename(out), size: fs.statSync(out).size };
}

(async () => {
  const results = [];
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--font-render-hinting=none'] });
  const page = await browser.newPage();

  for (const id of DESCENT) {
    const src = path.join(PUB, 'media', 'descent', `${id}.jpg`);
    const out = path.join(PUB, 'media', 'descent', `${id}.webp`);
    const src800 = path.join(PUB, 'media', 'descent', `${id}-800.jpg`);
    const out800 = path.join(PUB, 'media', 'descent', `${id}-800.webp`);
    if (fs.existsSync(src) && !fs.existsSync(out)) results.push(await toWebp(page, src, out));
    if (fs.existsSync(src800) && !fs.existsSync(out800)) results.push(await toWebp(page, src800, out800));
  }

  // derived/ holds the responsive steps used by MediaCover and the studio cards.
  for (const [name, width] of [['offers', 480], ['offers', 960], ['blog', 960]]) {
    const src = path.join(PUB, 'media', `${name}.jpg`);
    const out = path.join(PUB, 'media', 'derived', `${name}-${width}.webp`);
    if (fs.existsSync(src) && !fs.existsSync(out)) results.push(await toWebp(page, src, out, width));
  }

  const brand = fs.readFileSync(path.join(PUB, 'brand', 'horizontal-dark.svg'), 'utf8');
  const bg = `data:image/jpeg;base64,${b64(path.join(PUB, 'media', 'world.jpg'))}`;
  const ogHtml = `<!doctype html><html><head><meta charset="utf-8"><style>
    @font-face{font-family:SG;src:url(data:font/woff2;base64,);}
    *{margin:0;box-sizing:border-box}
    html,body{width:1200px;height:630px;overflow:hidden;background:#05060c}
    body{font-family:Inter,"Segoe UI",system-ui,sans-serif;color:#eaf1ff;position:relative}
    .bg{position:absolute;inset:0;background-image:url(${bg});background-size:cover;background-position:52% 45%;opacity:.42;filter:saturate(1.05)}
    .veil{position:absolute;inset:0;background:radial-gradient(120% 90% at 18% 15%,rgba(5,6,12,.28),rgba(5,6,12,.92) 72%)}
    .grid{position:absolute;inset:0;background:linear-gradient(rgba(120,200,255,.05) 1px,transparent 1px) 0 0/100% 42px,linear-gradient(90deg,rgba(120,200,255,.05) 1px,transparent 1px) 0 0/42px 100%}
    .in{position:absolute;inset:0;padding:64px 70px;display:flex;flex-direction:column;justify-content:space-between}
    .mark{width:430px}
    .mark svg{width:100%;height:auto;display:block}
    h1{font-size:66px;line-height:1.08;font-weight:800;letter-spacing:-1.6px}
    h1 em{font-style:normal;color:#5fe1ff}
    .sub{font-size:27px;line-height:1.45;color:#c6d7f2;max-width:900px;margin-top:18px}
    .row{display:flex;gap:14px;align-items:center;flex-wrap:wrap}
    .chip{font-size:19px;font-weight:700;letter-spacing:2.4px;text-transform:uppercase;color:#9fb6d8;border:1px solid rgba(150,190,240,.28);border-radius:999px;padding:9px 18px;background:rgba(12,20,38,.6)}
    .foot{display:flex;justify-content:space-between;align-items:flex-end;font-size:20px;color:#8fa8cd;letter-spacing:1.6px}
  </style></head><body>
    <div class="bg"></div><div class="veil"></div><div class="grid"></div>
    <div class="in">
      <div class="mark">${brand}</div>
      <div>
        <h1>Research, learning, media and games —<br><em>one connected digital world</em> in Nepal.</h1>
        <div class="sub">Five divisions, one descent: Thesyn Research, Academy, Darkroom, Stage and Games.</div>
      </div>
      <div>
        <div class="row">
          <span class="chip">Research</span><span class="chip">Academy</span><span class="chip">Darkroom</span><span class="chip">Entertainment</span><span class="chip">Games</span><span class="chip">Nepal</span>
        </div>
        <div class="foot" style="margin-top:30px"><span>ACTTOLOG WORLD</span><span>acttolog.github.io</span></div>
      </div>
    </div>
  </body></html>`;
  results.push(await shot(page, ogHtml, path.join(PUB, 'media', 'og-home.jpg'), 1200, 630, { type: 'jpeg', quality: 86 }));

  const icon = fs.readFileSync(path.join(PUB, 'brand', 'icon-dark.svg'), 'utf8');
  const logoHtml = `<!doctype html><html><head><style>*{margin:0}html,body{width:512px;height:512px;background:#05060c;display:grid;place-items:center}svg{width:400px;height:400px}</style></head><body>${icon}</body></html>`;
  results.push(await shot(page, logoHtml, path.join(PUB, 'brand', 'logo-512.png'), 512, 512, { type: 'png' }));

  await browser.close();
  const kb = (n) => `${(n / 1024).toFixed(0)}KB`;
  const jpgs = results.filter((r) => r.from);
  const savedFrom = jpgs.reduce((a, r) => a + r.from, 0);
  const savedTo = jpgs.reduce((a, r) => a + r.to, 0);
  jpgs.forEach((r) => console.log(`${r.src.padEnd(24)} ${kb(r.from).padStart(8)} -> ${kb(r.to).padStart(8)}  ${Math.round((1 - r.to / r.from) * 100)}% smaller`));
  console.log(`\nDESCENT TOTAL ${kb(savedFrom)} -> ${kb(savedTo)} (${Math.round((1 - savedTo / savedFrom) * 100)}% smaller)`);
  results.filter((r) => !r.from).forEach((r) => console.log(`built ${r.out} ${kb(r.size)}`));
})().catch((e) => { console.error('ASSETS FAILED:', e.message); process.exit(1); });
