/**
 * ACTTOLOG browser QA (STEP 23/96) — headless Chrome + software WebGL.
 * Captures runtime errors, verifies the 3D Earth renders real pixels,
 * exercises interactions (search, language, consent, AI dock, theme),
 * and screenshots key pages.
 */
const puppeteer = require('puppeteer');
const fs = require('fs');

const BASE = 'http://127.0.0.1:3100';
const OUT = process.cwd() + '/qa-shots';
fs.mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const browser = await puppeteer.launch({
    headless: 'shell',
    args: [
      '--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu-sandbox',
      '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader',
      '--window-size=1440,900',
    ],
  });

  const report = { pages: [], errors: [], checks: {} };

  const newPage = async (w = 1440, h = 900) => {
    const page = await browser.newPage();
    await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
    page.on('pageerror', (e) => report.errors.push({ type: 'pageerror', text: String(e).slice(0, 200) }));
    page.on('console', (m) => {
      if (m.type() === 'error') report.errors.push({ type: 'console', text: m.text().slice(0, 200) });
    });
    return page;
  };

  // ── 1. Home + 3D Earth ─────────────────────────────────────────
  {
    const page = await newPage();
    await page.goto(BASE + '/', { waitUntil: 'networkidle2', timeout: 60000 });
    await sleep(9000); // let the globe spin up, textures load, bloom compile

    // canvas exists + non-blank pixel test
    const canvasInfo = await page.evaluate(() => {
      const c = document.querySelector('#hero canvas');
      if (!c) return { exists: false };
      const gl = c.getContext('webgl2') || c.getContext('webgl');
      let nonBlank = false, colors = 0;
      try {
        const px = new Uint8Array(4 * 200);
        // sample a strip across the middle-right where the earth sits
        gl.readPixels(Math.floor(c.width * 0.55), Math.floor(c.height / 2), 200, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
        const seen = new Set();
        for (let i = 0; i < px.length; i += 4) {
          if (px[i] + px[i + 1] + px[i + 2] > 24) nonBlank = true;
          seen.add(`${px[i] >> 4},${px[i + 1] >> 4},${px[i + 2] >> 4}`);
        }
        colors = seen.size;
      } catch (e) { return { exists: true, readError: String(e).slice(0, 100) }; }
      return { exists: true, w: c.width, h: c.height, nonBlank, colors, ctxLost: gl.isContextLost() };
    });
    report.checks.globeCanvas = canvasInfo;

    // HUD readouts populated?
    report.checks.hud = await page.evaluate(() => {
      const q = (s) => (document.querySelector(s) || {}).textContent || '';
      return { quality: q('.hudbr div:nth-child(1)') || q('.hudbr'), clock: q('.hudtl div:nth-child(3)') };
    });

    await page.screenshot({ path: OUT + '/01-home-hero.png' });
    // scroll to ecosystem layer
    await page.evaluate(() => document.querySelector('#ecosystem')?.scrollIntoView());
    await sleep(1500);
    await page.screenshot({ path: OUT + '/02-home-ecosystem.png' });
    await page.evaluate(() => document.querySelector('#divisions')?.scrollIntoView());
    await sleep(1200);
    await page.screenshot({ path: OUT + '/03-home-divisions.png' });
    await page.evaluate(() => document.querySelector('#darkPrev')?.scrollIntoView());
    await sleep(1200);
    await page.screenshot({ path: OUT + '/04-home-darkroom.png' });
    await page.evaluate(() => document.querySelector('#cta')?.scrollIntoView());
    await sleep(1000);
    await page.screenshot({ path: OUT + '/05-home-cta.png' });
    report.pages.push('/ (home)');
    await page.close();
  }

  // ── 2. Interactions: language switch, search, theme, consent, AI dock ──
  {
    const page = await newPage();
    await page.goto(BASE + '/', { waitUntil: 'networkidle2', timeout: 60000 });
    await sleep(3000);

    const tryStep = async (label, fn) => { try { await fn(); } catch (e) { report.errors.push({ type: 'step:' + label, text: String((e && e.message) || e).slice(0, 140) }); } };
    // consent banner visible (no prior choice)
    report.checks.consentVisible = await page.evaluate(() => {
      const c = document.querySelector('#consent');
      return Boolean(c && c.textContent.includes('Privacy'));
    });
    // click "Allow all" via DOM (headless-robust)
    await tryStep('consent-allow-all', () => page.evaluate(() => {
      const btns = [...document.querySelectorAll('#consent button')];
      const all = btns.find((b) => /Allow all/i.test(b.textContent));
      if (all) all.click();
    }));
    await sleep(600);
    report.checks.consentDismissed = await page.evaluate(() => {
      const c = document.querySelector('#consent');
      return !c || !c.textContent.trim();
    });

    // language switch → Nepali
    const before = await page.evaluate(() => document.querySelector('.nlink')?.textContent || '');
    await page.click('#nav button[title="English | नेपाली"], .nact button:nth-child(2)');
    await sleep(900);
    const after = await page.evaluate(() => {
      return {
        htmlLang: document.documentElement.lang,
        navText: document.querySelector('.nlink')?.textContent || '',
        hasDevanagari: /[\u0900-\u097F]/.test(document.body.textContent),
      };
    });
    report.checks.languageSwitch = { before: before.trim(), after: after.navText.trim(), htmlLang: after.htmlLang, devanagari: after.hasDevanagari };
    await page.screenshot({ path: OUT + '/06-home-nepali.png' });
    // switch back
    await page.click('#nav button[title="English | नेपाली"], .nact button:nth-child(2)');
    await sleep(500);

    // theme toggle → light
    await page.click('.nact button[aria-label="Theme"], .nact button:nth-child(3)');
    await sleep(1200);
    report.checks.theme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    await page.screenshot({ path: OUT + '/07-home-light.png' });
    await page.click('.nact button[aria-label="Theme"], .nact button:nth-child(3)');
    await sleep(800);

    // search overlay via ⌘K
    await page.keyboard.down('Control'); await page.keyboard.press('KeyK'); await page.keyboard.up('Control');
    await sleep(900);
    const searchOpen = await page.evaluate(() => Boolean(document.querySelector('.mbd input[aria-label*="earch"], .mbd .inp')));
    report.checks.searchOverlay = searchOpen;
    if (searchOpen) {
      await page.type('.mbd .inp', 'panel data');
      await sleep(1500);
      report.checks.searchResults = await page.evaluate(() => document.querySelectorAll('.mbd .rowlink').length);
      await page.screenshot({ path: OUT + '/08-search-overlay.png' });
      await page.keyboard.press('Escape');
      await sleep(500);
    }

    // AI dock
    await page.click('#aifab');
    await sleep(1000);
    report.checks.aiDockOpen = await page.evaluate(() => document.querySelector('#aidock')?.classList.contains('open'));
    const aiInput = await page.$('#aidock input');
    if (aiInput) {
      await aiInput.type('free tools for panel data analysis');
      await page.keyboard.press('Enter');
      await sleep(4000);
      report.checks.aiReply = await page.evaluate(() => {
        const msgs = document.querySelectorAll('#aidock .aimsg.a');
        return msgs.length ? msgs[msgs.length - 1].textContent.slice(0, 120) : '(no reply)';
      });
      report.checks.aiSources = await page.evaluate(() => document.querySelectorAll('#aidock .srcpill').length);
      await page.screenshot({ path: OUT + '/09-ai-dock.png' });
    }
    report.pages.push('/ (interactions)');
    await page.close();
  }

  // ── 3. Key pages ───────────────────────────────────────────────
  const shots = [
    ['/research', '10-research.png'],
    ['/darkroom', '11-darkroom.png'],
    ['/blog', '12-blog.png'],
    ['/offers', '13-offers.png'],
    ['/academy', '14-academy.png'],
    ['/contact', '15-contact.png'],
    ['/ai', '16-ai-page.png'],
    ['/admin/login', '17-admin-login.png'],
    ['/my', '18-my-signin.png'],
    ['/darkroom/google-scholar', '19-dr-profile.png'],
  ];
  for (const [path, file] of shots) {
    const page = await newPage();
    try {
      await page.goto(BASE + path, { waitUntil: 'networkidle2', timeout: 45000 });
      await sleep(1800);
      await page.screenshot({ path: OUT + '/' + file });
      report.pages.push(path);
    } catch (e) {
      report.errors.push({ type: 'nav', text: path + ': ' + String(e).slice(0, 120) });
    }
    await page.close();
  }

  // ── 4. Mobile pass (390x844) ───────────────────────────────────
  {
    const page = await newPage(390, 844);
    await page.goto(BASE + '/', { waitUntil: 'networkidle2', timeout: 60000 });
    await sleep(7000);
    await page.screenshot({ path: OUT + '/20-mobile-hero.png' });
    // burger drawer
    await page.click('.burger');
    await sleep(900);
    report.checks.drawerOpen = await page.evaluate(() => document.querySelector('#drawer')?.classList.contains('open'));
    await page.screenshot({ path: OUT + '/21-mobile-drawer.png' });
    await page.close();

    const p2 = await newPage(390, 844);
    await p2.goto(BASE + '/darkroom', { waitUntil: 'networkidle2', timeout: 45000 });
    await sleep(1500);
    await p2.screenshot({ path: OUT + '/22-mobile-darkroom.png' });
    await p2.close();
    report.pages.push('/ (mobile 390x844)');
  }

  await browser.close();

  // ── summary ────────────────────────────────────────────────────
  const real = report.errors.filter((e) =>
    !/favicon|Download the React DevTools|404 \(Not Found\)/i.test(e.text));
  console.log('PAGES OK:', report.pages.length);
  console.log('CHECKS:', JSON.stringify(report.checks, null, 1));
  console.log('RUNTIME ERRORS (' + real.length + '):');
  real.slice(0, 12).forEach((e) => console.log(' •', e.type, e.text));
  fs.writeFileSync(OUT + '/report.json', JSON.stringify(report, null, 2));
}

main().catch((e) => { console.error('QA FAILED:', e.message); process.exit(1); });
