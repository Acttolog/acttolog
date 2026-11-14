// Captures the real Ludo board and composes the arcade cover + thumbnail.
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const BASE = 'http://127.0.0.1:8130';
const GAME = `${BASE}/arcade/index.html?game=ludo-himalaya&ludoTest=1`;
const OUT = path.join(__dirname, '..', '.shots');
const ART = path.join(OUT, 'ludo-board-art.png');

const COVER = `<!doctype html><html><head><meta charset="utf-8"><style>
  *{box-sizing:border-box;margin:0}
  html,body{width:1200px;height:675px;overflow:hidden}
  body{
    font-family:Inter,"Segoe UI",system-ui,-apple-system,sans-serif;color:#eef1f7;
    background:
      radial-gradient(760px 520px at 82% 46%,rgba(226,181,102,.16),transparent 62%),
      radial-gradient(560px 380px at 96% 100%,rgba(67,224,211,.10),transparent 60%),
      radial-gradient(700px 480px at 6% 0%,rgba(67,224,211,.07),transparent 55%),
      linear-gradient(160deg,#070a11 0%,#080b13 48%,#05070c 100%);
    position:relative;
  }
  .grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.028) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.028) 1px,transparent 1px);background-size:64px 64px;mask-image:radial-gradient(700px 500px at 30% 40%,#000,transparent 78%)}
  .pad{position:absolute;inset:0;padding:46px 58px 40px;display:flex;flex-direction:column}
  header{display:flex;align-items:center;gap:12px}
  .mark{width:26px;height:26px}
  .word{font-weight:800;font-size:19px;letter-spacing:.16em}
  .chip{font:700 10px/1 "Cascadia Mono",Consolas,monospace;letter-spacing:.14em;color:#7fe9df;border:1px solid rgba(67,224,211,.5);border-radius:5px;padding:6px 8px}
  .series{margin-left:auto;font:700 10.5px/1 "Cascadia Mono",Consolas,monospace;letter-spacing:.28em;color:#e2b566}
  .hero{flex:1;display:flex;align-items:center;margin-top:-10px}
  .copy{width:470px;position:relative;z-index:2}
  .eyebrow{font:700 11px/1 "Cascadia Mono",Consolas,monospace;letter-spacing:.26em;color:#43e0d3;margin-bottom:22px}
  h1{font-size:88px;line-height:.92;letter-spacing:-.035em;font-weight:850}
  h1 span{display:block}
  .sub{color:#9aa6b8;font-size:20px;line-height:1.5;margin-top:20px;max-width:400px}
  .tags{margin-top:26px;font:600 10.5px/1.6 "Cascadia Mono",Consolas,monospace;letter-spacing:.12em;color:#6f7c90;display:flex;gap:14px;flex-wrap:wrap}
  .tags b{color:#cdd6e4;font-weight:600}
  footer{display:flex;align-items:center;border-top:1px solid rgba(255,255,255,.08);padding-top:16px;font-size:11.5px;color:#6f7c90;letter-spacing:.08em}
  footer b{color:#dfe6f1;letter-spacing:.14em;margin-right:8px}
  footer .right{margin-left:auto;font:600 10.5px/1 "Cascadia Mono",Consolas,monospace;letter-spacing:.2em;color:#7f8ca0}
  .art{position:absolute;right:-8px;top:72px;width:640px;height:550px;display:grid;place-items:center;z-index:1}
  .art::before{content:"";position:absolute;width:560px;height:560px;border-radius:50%;background:radial-gradient(circle,rgba(226,181,102,.22),rgba(226,181,102,.05) 46%,transparent 68%);filter:blur(6px)}
  .art img{position:relative;height:540px;width:auto;filter:drop-shadow(0 36px 48px rgba(0,0,0,.66))}
</style></head><body>
  <div class="grid"></div>
  <div class="pad">
    <header>
      <svg class="mark" viewBox="0 0 32 32"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#43e0d3"/><stop offset=".55" stop-color="#7b8cff"/><stop offset="1" stop-color="#ff9f6e"/></linearGradient></defs><path d="M3 25 13 6l4.4 8.2L22.6 7 30 25z" fill="url(#g)"/></svg>
      <span class="word">ACTTOLOG</span><span class="chip">ARCADE</span>
      <span class="series">NEPAL SERIES</span>
    </header>
    <div class="hero">
      <div class="copy">
        <p class="eyebrow">3D BOARD CLASSIC</p>
        <h1><span>Ludo</span><span>Himalaya</span></h1>
        <p class="sub">Walnut, brass and glass. The classic ludo table, rebuilt in three dimensions.</p>
        <div class="tags"><span><b>2–4 PLAYERS</b></span><span>CPU OR PASS &amp; PLAY</span><span>SAVE &amp; RESUME</span></div>
      </div>
    </div>
    <footer><b>ACTTOLOG ARCADE</b> Built by ACTTOLOG · Nepal<span class="right">PLAY FREE · NO ACCOUNT</span></footer>
  </div>
  <div class="art"><img src="ludo-board-art.png" alt=""></div>
</body></html>`;

const THUMB = `<!doctype html><html><head><meta charset="utf-8"><style>
  *{box-sizing:border-box;margin:0}
  html,body{width:1200px;height:675px;overflow:hidden}
  body{background:
    radial-gradient(700px 480px at 52% 44%,rgba(226,181,102,.16),transparent 62%),
    radial-gradient(420px 300px at 82% 92%,rgba(47,129,81,.12),transparent 60%),
    linear-gradient(160deg,#070a11,#05070c);
    display:grid;place-items:center;position:relative}
  .grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.026) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.026) 1px,transparent 1px);background-size:60px 60px;mask-image:radial-gradient(560px 420px at 50% 50%,#000,transparent 80%)}
  img{position:relative;height:596px;width:auto;filter:drop-shadow(0 40px 50px rgba(0,0,0,.7));transform:rotate(-1deg)}
</style></head><body><div class="grid"></div><img src="ludo-board-art.png" alt=""></body></html>`;

(async () => {
  fs.writeFileSync(path.join(OUT, 'cover-ludo.html'), COVER);
  fs.writeFileSync(path.join(OUT, 'thumb-ludo.html'), THUMB);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 1000, deviceScaleFactor: 2 });
  await page.goto(GAME, { waitUntil: 'networkidle0', timeout: 45000 });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle0' });
  await page.waitForSelector('.lh-setupcard');
  await page.evaluate(() => window.__ludo.start({ players: 4, mode: 'human' }));
  await new Promise((r) => setTimeout(r, 300));
  await page.evaluate(() => {
    window.__ludo.speed(0);
    const put = (c, i, pos) => window.__ludo.setToken(c, i, pos);
    put('red', 0, 9);
    put('red', 1, 55);
    put('red', 2, 30);
    put('green', 0, 21);
    put('green', 1, 47);
    put('yellow', 0, 36);
    put('yellow', 1, 12);
    put('blue', 0, 4);
    put('blue', 1, 44);
  });
  await new Promise((r) => setTimeout(r, 500));
  await page.evaluate(() => {
    const style = document.createElement('style');
    style.textContent = `
      html,body,#app,.lh-wrap{background:transparent!important;box-shadow:none!important}
      .topbar,.sitefoot,.gamebar,.lh-head,.lh-turnbar,.lh-side,.lh-hint,.toast{display:none!important}
      .lh-wrap{padding:0!important;border:0!important}
      .lh-wrap::before,.lh-wrap::after{display:none!important}
      .lh-body{display:block!important}
      .lh-play{padding:0!important}
    `;
    document.head.appendChild(style);
  });
  await new Promise((r) => setTimeout(r, 300));
  const rect = await page.$eval('#lhBoard', (el) => {
    const b = el.getBoundingClientRect();
    return { x: b.x, y: b.y, width: b.width, height: b.height };
  });
  const pad = 26;
  await page.screenshot({
    path: ART,
    omitBackground: true,
    clip: { x: rect.x - pad, y: rect.y - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 },
  });
  const sharp = require('sharp');
  const trimmed = await sharp(ART).trim({ threshold: 1 }).png().toBuffer({ resolveWithObject: true });
  await sharp(trimmed.data).png().toFile(path.join(OUT, 'ludo-board-trim.png'));
  console.log('board art saved', ART, trimmed.info.width, trimmed.info.height);

  const compose = async (file, out, width, height) => {
    const p = await browser.newPage();
    await p.setViewport({ width, height, deviceScaleFactor: 1 });
    await p.goto(`file:///${path.join(OUT, file).replace(/\\/g, '/')}`, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 250));
    await p.screenshot({ path: out, type: 'jpeg', quality: 88 });
    await p.close();
    console.log('saved', out);
  };
  await compose(
    'cover-ludo.html',
    path.join(__dirname, '..', 'public', 'media', 'arcade', 'ludo-himalaya.jpg'),
    1200,
    675,
  );
  await compose(
    'thumb-ludo.html',
    path.join(__dirname, '..', 'public', 'media', 'arcade', 'thumbs', 'ludo-himalaya.jpg'),
    1200,
    675,
  );

  await browser.close();
})();
