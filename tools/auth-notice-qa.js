/**
 * Auth notice QA — proves the OAuth failure paths explain themselves.
 *
 * Usage: node tools/auth-notice-qa.js [base-url]   (default http://127.0.0.1:3123)
 */
const puppeteer = require('puppeteer');
const fs = require('fs');

const BASE = process.argv[2] || 'http://127.0.0.1:3123';
const OUT = process.cwd() + '/qa-shots';
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + String(detail).slice(0, 140) : ''}`);
  return ok;
}

async function open(browser, url, width = 1280, height = 900) {
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 90000 });
  return { page, errors };
}

async function dialogState(page) {
  return page.evaluate(() => {
    const d = document.querySelector('[role="alertdialog"]') || document.querySelector('[role="dialog"][aria-modal="true"]');
    if (!d) return null;
    const r = d.getBoundingClientRect();
    return {
      title: d.querySelector('#auth-notice-title')?.textContent?.trim() || d.querySelector('h3')?.textContent?.trim() || '',
      body: d.querySelector('p')?.textContent?.trim() || '',
      buttons: [...d.querySelectorAll('button, a')].map((b) => b.textContent.trim()).filter(Boolean),
      focused: document.activeElement?.textContent?.trim() || '',
      width: Math.round(r.width),
      offsetLeft: Math.round(r.left),
      overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  });
}

async function main() {
  const browser = await puppeteer.launch({
    headless: 'shell',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader'],
  });

  // Static mirrors ship without /api routes: retry cannot leave for an OAuth
  // start, so the honest outcome is the in-page preview notice.
  const staticHost = await fetch(`${BASE}/api/auth/session`).then((r) => r.status === 404).catch(() => false);
  console.log(`TARGET ${BASE} — ${staticHost ? 'static mirror' : 'SSR runtime'}`);

  // 1. not_configured on /contact
  {
    const { page, errors } = await open(browser, `${BASE}/contact?oauth=not_configured`);
    await sleep(700);
    const d = await dialogState(page);
    check('contact: dialog appears for oauth=not_configured', !!d, d ? d.title : 'no dialog');
    if (d) {
      check('contact: not-configured copy', /not switched on yet/i.test(d.title), d.title);
      check('contact: no dead-end retry button', !d.buttons.some((b) => /try again/i.test(b)), d.buttons.join(' | '));
      check('contact: offers CONTACT + CLOSE', d.buttons.some((b) => /contact/i.test(b)) && d.buttons.some((b) => /close/i.test(b)), d.buttons.join(' | '));
      check('contact: focus moved into dialog', !!d.focused, d.focused);
    }
    await page.screenshot({ path: `${OUT}/auth-notice-contact.png` });

    // CLOSE cleans URL and does not reopen
    const btn = await page.$('[role="alertdialog"] button');
    const closers = await page.$$('[role="alertdialog"] button');
    let closed = false;
    for (const c of closers) {
      const txt = await c.evaluate((el) => el.textContent.trim());
      if (/close/i.test(txt)) { await c.click(); closed = true; break; }
    }
    await sleep(600);
    const afterUrl = page.url();
    const afterDialog = await dialogState(page);
    check('contact: CLOSE dismissed dialog', closed && !afterDialog, afterDialog ? 'still open' : 'closed');
    check('contact: URL cleaned after CLOSE', !/[?&](oauth|auth|reason)=/.test(afterUrl), afterUrl);
    await page.reload({ waitUntil: 'networkidle2' });
    await sleep(600);
    check('contact: does not reopen after reload', !(await dialogState(page)));
    check('contact: no page errors', errors.length === 0, errors.slice(0, 2).join(' / '));
    await page.close();
  }

  // 2. expired (state_mismatch) on home
  {
    const { page, errors } = await open(browser, `${BASE}/?auth=error&reason=state_mismatch`);
    await sleep(900);
    const d = await dialogState(page);
    check('home: dialog appears for state_mismatch', !!d, d ? d.title : 'no dialog');
    if (d) {
      check('home: expired copy', /expired/i.test(d.title), d.title);
      check('home: offers TRY AGAIN', d.buttons.some((b) => /try again/i.test(b)), d.buttons.join(' | '));
    }
    await page.screenshot({ path: `${OUT}/auth-notice-expired.png` });

    // TRY AGAIN should route through the OAuth start and land on not-configured
    const btns = await page.$$('[role="alertdialog"] button');
    for (const b of btns) {
      const txt = await b.evaluate((el) => el.textContent.trim());
      if (/try again/i.test(txt)) { await b.click(); break; }
    }
    await sleep(2500);
    const url = page.url();
    const d2 = await dialogState(page);
    if (staticHost) {
      check('home: TRY AGAIN stays on the page', new URL(url).pathname === '/', url);
      check('home: retry surfaces the preview notice', !!d2 && /available in this preview/i.test(d2.title), d2 ? d2.title : 'no dialog');
    } else {
      check('home: TRY AGAIN reaches oauth start', /\/contact\?oauth=not_configured|\/api\/auth\/google/.test(url), url);
      check('home: retry surfaces the real blocker', !!d2 && /not switched on yet/i.test(d2.title), d2 ? d2.title : 'no dialog');
    }
    check('home: no page errors', errors.length === 0, errors.slice(0, 2).join(' / '));
    await page.close();
  }

  // 3. generic failure
  {
    const { page } = await open(browser, `${BASE}/?auth=error&reason=token_verification_failed`);
    await sleep(900);
    const d = await dialogState(page);
    check('home: generic failure copy', !!d && /could not complete/i.test(d.title), d ? d.title : 'no dialog');
    await page.screenshot({ path: `${OUT}/auth-notice-failed.png` });
    await page.close();
  }

  // 4. mobile 390px
  {
    const { page } = await open(browser, `${BASE}/contact?oauth=not_configured`, 390, 844);
    await sleep(900);
    const d = await dialogState(page);
    check('mobile: dialog fits 390px', !!d && d.width <= 390 && !d.overflowX, d ? `${d.width}px, overflowX=${d.overflowX}` : 'no dialog');
    check('mobile: dialog not clipped left', !!d && d.offsetLeft >= 0, d ? `left=${d.offsetLeft}` : '');
    await page.screenshot({ path: `${OUT}/auth-notice-mobile.png`, fullPage: false });
    await page.close();
  }

  // 5. clean page must show nothing
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await sleep(2500);
    check('home: no dialog on a clean URL', !(await dialogState(page)));
    await page.close();
  }

  await browser.close();
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  if (failed.length) { console.log('FAILED: ' + failed.map((f) => f.name).join('; ')); process.exit(1); }
}

main().catch((e) => { console.error(e); process.exit(1); });
