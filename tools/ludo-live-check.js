// Live-site verification for Ludo Himalaya (reads only, plays a real match).
const puppeteer = require('puppeteer');

const BASE = 'https://acttolog.github.io';
const results = [];
const check = (name, ok, detail = '') => {
  results.push(ok);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
};

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 950 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });

  await page.goto(`${BASE}/arcade/index.html?nc=${Date.now()}`, {
    waitUntil: 'networkidle2',
    timeout: 60000,
  });
  await new Promise((r) => setTimeout(r, 900));
  const launcher = await page.evaluate(() => ({
    cards: document.querySelectorAll('.gcard').length,
    covers: [...document.querySelectorAll('.gcard-cover img')].map((i) => i.naturalWidth),
    note: document.querySelector('.series-note')?.textContent || '',
    ludo: [...document.querySelectorAll('.gcard')].some((c) => /ludo/i.test(c.textContent)),
  }));
  check('launcher shows six cards', launcher.cards === 6, String(launcher.cards));
  check(
    'every cover loads',
    launcher.covers.length === 6 && launcher.covers.every((w) => w > 0),
    JSON.stringify(launcher.covers),
  );
  check('launcher announces six games', /6 games/.test(launcher.note), launcher.note);
  check('Ludo card is present', launcher.ludo);

  await page.goto(`${BASE}/arcade/index.html?game=ludo-himalaya&ludoTest=1&nc=${Date.now()}`, {
    waitUntil: 'networkidle2',
    timeout: 60000,
  });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle2' });
  await page.waitForSelector('.lh-setupcard', { timeout: 30000 });
  check('live setup opens', true);
  await page.click('#lhStart');
  await new Promise((r) => setTimeout(r, 400));
  check('live match starts', (await page.evaluate(() => window.__ludo.phase())) === 'rolling');
  check(
    'live board has 8 marbles',
    (await page.evaluate(() => document.querySelectorAll('.lh-token').length)) === 8,
  );
  await page.evaluate(() => window.__ludo.queue(6));
  await page.click('#lhRoll');
  await page
    .waitForFunction(() => window.__ludo.phase() === 'choosing', { timeout: 12000, polling: 40 })
    .catch(() => {});
  check('live roll of six offers moves', (await page.evaluate(() => window.__ludo.phase())) === 'choosing');
  await page.click('.lh-token.can-move');
  await new Promise((r) => setTimeout(r, 900));
  const st = await page.evaluate(() => window.__ludo.state());
  check(
    'live marble leaves the yard',
    st.players[0].tokens.some((t) => t === 0),
    JSON.stringify(st.players[0].tokens),
  );
  await page.screenshot({ path: '.shots/ludo-live.png' });
  check('no console errors during live play', errors.length === 0, errors.slice(0, 2).join(' | '));

  const gamePage = await browser.newPage();
  await gamePage.setViewport({ width: 1440, height: 1000 });
  await gamePage.goto(`${BASE}/games/ludo-himalaya?nc=${Date.now()}`, {
    waitUntil: 'networkidle2',
    timeout: 60000,
  });
  await new Promise((r) => setTimeout(r, 500));
  const site = await gamePage.evaluate(() => ({
    h1: document.querySelector('h1')?.textContent?.trim(),
    play: [...document.querySelectorAll('button')].some((b) => /play now/i.test(b.textContent || '')),
    thumb: [...document.querySelectorAll('img')].some((i) => /ludo-himalaya/.test(i.currentSrc || i.src)),
  }));
  check('live game page heading', site.h1 === 'Ludo Himalaya', site.h1);
  check('live game page has Play now', site.play);
  check('live game page loads the artwork', site.thumb);
  await gamePage.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((x) => /play now/i.test(x.textContent || ''));
    if (b) b.click();
  });
  await new Promise((r) => setTimeout(r, 6000));
  const frame = gamePage.frames().find((f) => f.url().includes('/arcade/index.html'));
  const inFrame = frame
    ? await frame.evaluate(() => document.querySelector('#gvTitle')?.textContent?.trim()).catch(() => null)
    : null;
  check(
    'live Play now embeds Ludo',
    !!frame && frame.url().includes('game=ludo-himalaya') && inFrame === 'Ludo Himalaya',
    inFrame || 'no frame',
  );
  await gamePage.screenshot({ path: '.shots/ludo-live-site.png' });

  await browser.close();
  const failed = results.filter((x) => !x).length;
  console.log(`\nLive checks: ${results.length - failed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})();
