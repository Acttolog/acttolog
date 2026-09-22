/**
 * ACTTOLOG browser QA (STEP 23/96) — headless Chrome + software WebGL.
 * Captures runtime errors, verifies the 3D Earth, exercises interactions
 * (consent, search, language, theme, AI dock, mobile drawer) and screenshots
 * key pages. All interactions are DOM-level clicks (headless-robust).
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
    ],
  });

  const report = { pages: [], errors: [], checks: {} };
  const step = async (label, fn) => {
    try { await fn(); } catch (e) { report.errors.push({ type: 'step:' + label, text: String((e && e.message) || e).slice(0, 140) }); }
  };

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
    await sleep(10000);

    report.checks.globe = await page.evaluate(() => {
      const c = document.querySelector('#hero canvas');
      const e = window.__atlEarth || null;
      return { canvas: Boolean(c), earthUniforms: e };
    });

    await page.screenshot({ path: OUT + '/01-home-hero.png' });
    for (const [sel, file, wait] of [
      ['#ecosystem', '02-home-ecosystem.png', 1400],
      ['#divisions', '03-home-divisions.png', 1200],
      ['#darkPrev', '04-home-darkroom.png', 1200],
      ['#cta', '05-home-cta.png', 1000],
    ]) {
      await step('scroll-' + sel, () => page.evaluate((s) => document.querySelector(s)?.scrollIntoView(), sel));
      await sleep(wait);
      await page.screenshot({ path: OUT + '/' + file });
    }
    report.pages.push('/ (home)');
    await page.close();
  }

  // ── 2. Interactions ────────────────────────────────────────────
  {
    const page = await newPage();
    await page.goto(BASE + '/', { waitUntil: 'networkidle2', timeout: 60000 });
    await sleep(4000);

    report.checks.consentVisible = await page.evaluate(() =>
      Boolean(document.querySelector('#consent') && document.querySelector('#consent').textContent.includes('Privacy')));

    await step('consent-allow-all', () => page.evaluate(() => {
      const all = [...document.querySelectorAll('#consent button')].find((b) => /Allow all/i.test(b.textContent));
      if (all) all.click();
    }));
    await sleep(700);
    report.checks.consentDismissed = await page.evaluate(() => {
      const c = document.querySelector('#consent');
      return !c || !c.textContent.trim();
    });

    // language switch → Nepali
    const clickLang = () => page.evaluate(() => {
      const b = [...document.querySelectorAll('.nact button')].find((x) => (x.getAttribute('title') || '').includes('नेपाली'));
      if (b) b.click();
    });
    await step('lang-switch', clickLang);
    await sleep(1000);
    report.checks.language = await page.evaluate(() => ({
      htmlLang: document.documentElement.lang,
      devanagariVisible: /[\u0900-\u097F]/.test(document.querySelector('main')?.textContent || ''),
    }));
    await page.screenshot({ path: OUT + '/06-home-nepali.png' });
    await step('lang-back', clickLang);
    await sleep(600);

    // theme toggle → light → shot → back
    const clickTheme = () => page.evaluate(() => {
      const b = [...document.querySelectorAll('.nact button')].find((x) => x.getAttribute('aria-label') === 'Theme');
      if (b) b.click();
    });
    await step('theme-light', clickTheme);
    await sleep(1500);
    report.checks.themeAfterToggle = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    await page.screenshot({ path: OUT + '/07-home-light.png' });
    await step('theme-back', clickTheme);
    await sleep(900);

    // search overlay
    await step('search-open', () => page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }))));
    await sleep(1000);
    let searchOpen = await page.evaluate(() => Boolean(document.querySelector('.mbd')));
    if (!searchOpen) {
      await step('search-open-click', () => page.evaluate(() => document.querySelector('#btnSearch')?.click()));
      await sleep(900);
      searchOpen = await page.evaluate(() => Boolean(document.querySelector('.mbd')));
    }
    report.checks.searchOverlayOpen = searchOpen;
    if (searchOpen) {
      await step('search-type', () => page.evaluate(() => {
        const i = document.querySelector('.mbd input');
        if (!i) return;
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(i, 'panel data');
        i.dispatchEvent(new Event('input', { bubbles: true }));
      }));
      await sleep(1600);
      report.checks.searchResults = await page.evaluate(() => document.querySelectorAll('.mbd .rowlink').length);
      await page.screenshot({ path: OUT + '/08-search-overlay.png' });
      await step('search-close', () => page.evaluate(() => {
        const btns = [...document.querySelectorAll('.mbd button')];
        const x = btns.find((b) => (b.getAttribute('aria-label') || '') === 'Close' || b.textContent === '✕');
        if (x) x.click(); else document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      }));
      await sleep(600);
    }

    // AI dock + question
    await step('ai-fab', () => page.evaluate(() => document.querySelector('#aifab')?.click()));
    await sleep(1200);
    report.checks.aiDockOpen = await page.evaluate(() => document.querySelector('#aidock')?.classList.contains('open'));
    await step('ai-ask', () => page.evaluate(() => {
      const i = document.querySelector('#aidock input');
      if (!i) return;
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(i, 'free tools for panel data analysis');
      i.dispatchEvent(new Event('input', { bubbles: true }));
      document.querySelector('#aidock form')?.requestSubmit();
    }));
    await sleep(4500);
    report.checks.aiReply = await page.evaluate(() => {
      const msgs = document.querySelectorAll('#aidock .aimsg.a');
      return msgs.length ? msgs[msgs.length - 1].textContent.slice(0, 110) : '(no reply)';
    });
    report.checks.aiSourcePills = await page.evaluate(() => document.querySelectorAll('#aidock .srcpill').length);
    await page.screenshot({ path: OUT + '/09-ai-dock.png' });
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

  // ── 4. Mobile (390x844) ────────────────────────────────────────
  {
    const page = await newPage(390, 844);
    await page.goto(BASE + '/', { waitUntil: 'networkidle2', timeout: 60000 });
    await sleep(8000);
    await page.screenshot({ path: OUT + '/20-mobile-hero.png' });
    await step('burger', () => page.evaluate(() => document.querySelector('.burger')?.click()));
    await sleep(1000);
    report.checks.mobileDrawerOpen = await page.evaluate(() => document.querySelector('#drawer')?.classList.contains('open'));
    await page.screenshot({ path: OUT + '/21-mobile-drawer.png' });
    await page.close();

    const p2 = await newPage(390, 844);
    await p2.goto(BASE + '/darkroom', { waitUntil: 'networkidle2', timeout: 45000 });
    await sleep(1600);
    await p2.screenshot({ path: OUT + '/22-mobile-darkroom.png' });
    await p2.close();
    report.pages.push('/ (mobile)');
  }

  await browser.close();

  const real = report.errors.filter((e) => !/favicon|React DevTools/i.test(e.text));
  console.log('PAGES VERIFIED:', report.pages.length);
  console.log('CHECKS:', JSON.stringify(report.checks, null, 1));
  console.log('RUNTIME ISSUES (' + real.length + '):');
  real.slice(0, 10).forEach((e) => console.log(' •', e.type, '-', e.text));
  fs.writeFileSync(OUT + '/report.json', JSON.stringify(report, null, 2));
}

main().catch((e) => { console.error('QA FAILED:', e.message); process.exit(1); });
