/**
 * CUBE/26 games-section QA — card, play-now stage, embedded game boot,
 * lab interaction, mobile width and standalone app.
 * Usage: node tools/games-cube26-qa.js [base-url]
 */
const puppeteer = require('puppeteer');
const BASE = (process.argv[2] || 'http://127.0.0.1:8123').replace(/\/$/, '');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (n, ok, d = '') => {
  results.push({ n, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`);
};

async function frameWithGame(page, timeout = 120000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    for (const f of page.frames()) {
      try {
        if (/(^|\/)cube26(\/|$)/.test(new URL(f.url()).pathname)) {
          const ok = await f.evaluate(() => !!document.querySelector('#stage'));
          if (ok) return f;
        }
      } catch {
        /* frame mid-navigation */
      }
    }
    await sleep(400);
  }
  return null;
}

async function boot() {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--enable-unsafe-swiftshader',
      '--use-angle=swiftshader',
    ],
  });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await page.evaluateOnNewDocument(() => {
    try {
      localStorage.setItem(
        'act_consent',
        JSON.stringify({ necessary: true, analytics: false, personalization: false }),
      );
    } catch {}
  });
  return { browser, page, errors };
}

async function goto(page, path) {
  await page.goto(BASE + path, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await sleep(3500);
}

(async () => {
  // ── desktop: games list → detail → embedded game ──
  {
    const { browser, page, errors } = await boot();
    await page.setViewport({ width: 1440, height: 900 });
    await goto(page, '/games');

    const list = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('a[href^="/games/"]')];
      const card = cards.find((a) => /CUBE\/26/.test(a.textContent));
      return {
        count: cards.length,
        hasCard: Boolean(card),
        href: card ? card.getAttribute('href') : null,
        text: card ? card.textContent.replace(/\s+/g, ' ').trim() : '',
        firstIsArcade: cards
          .slice(0, 5)
          .every((a) =>
            /\/games\/(khoja-nepal|merge-himalaya|himalaya-stack|typerush-nepal|nepal-daily)/.test(
              a.getAttribute('href'),
            ),
          ),
        footnote: document.body.innerText.includes('Nepal Series arcade and CUBE/26 play instantly'),
      };
    });
    check('Games page lists CUBE/26', list.hasCard);
    check('CUBE/26 card links to its page', /\/games\/cube-26\/?$/.test(list.href || ''), list.href || '');
    check('Card CTA says Play now', /Play now/i.test(list.text), list.text.slice(0, 120));
    check('Nepal Series games lead the newest-first list', list.firstIsArcade);
    check('Footnote explains free vs member play', list.footnote);

    // open the detail page directly (static-safe path)
    await goto(page, '/games/cube-26/');
    const detail = await page.evaluate(() => ({
      h1: document.querySelector('h1')?.textContent || '',
      poster: Boolean(document.querySelector('img[src*="cube26.jpg"]')),
      playBtn: [...document.querySelectorAll('button')].some((b) => /Play now/i.test(b.textContent || '')),
      full: [...document.querySelectorAll('a')].some((a) =>
        /\/cube26\/?$/.test(a.getAttribute('href') || ''),
      ),
      access: /public/i.test(document.body.textContent || ''),
    }));
    check('Detail page headline is CUBE/26', /CUBE\/26/.test(detail.h1), detail.h1);
    check('Poster uses the CUBE/26 cover', detail.poster);
    check('Play now button on stage', detail.playBtn);
    check('Full-screen link present', detail.full);
    check('Public access badge', detail.access);

    await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find((x) => /Play now/i.test(x.textContent || ''));
      if (b) b.click();
    });
    const iframe = await page.waitForSelector('iframe[src="/cube26/"]', { timeout: 20000 }).catch(() => null);
    check('Play now mounts the game iframe', Boolean(iframe));
    const frame = iframe ? await frameWithGame(page) : null;
    check('Embedded game frame boots', Boolean(frame));

    if (frame) {
      const state = await frame
        .waitForFunction(
          () => {
            const s = document.querySelector('#status')?.dataset.state;
            return s && s !== 'booting' ? s : false;
          },
          { timeout: 120000 },
        )
        .then((h) => h.jsonValue())
        .catch(() => null);
      check('Game reaches a ready state', Boolean(state), String(state));
      const canvas = await frame.evaluate(() => {
        const c = document.querySelector('#stage');
        return {
          w: c ? c.width : 0,
          h: c ? c.height : 0,
          fallback: document.querySelector('#fallback')?.hidden !== false,
        };
      });
      check(
        'WebGL canvas is live (no fallback)',
        canvas.w > 0 && canvas.h > 0 && canvas.fallback,
        `${canvas.w}×${canvas.h}`,
      );

      await frame.evaluate(() => document.querySelector('#customBtn')?.click());
      await sleep(1200);
      const lab = await frame.evaluate(() => ({
        open: Boolean(document.querySelector('#labDialog')?.open),
        stickers: document.querySelectorAll('#labNet [data-sticker], #labNet button').length,
      }));
      check('Lab opens inside the embed', lab.open);
      check('Lab paints 54 stickers', lab.stickers === 54, String(lab.stickers));
      await frame.evaluate(() => document.querySelector('#labClose')?.click());
      await sleep(500);
      const closed = await frame.evaluate(() => !document.querySelector('#labDialog')?.open);
      check('Lab closes', closed);
    }

    const visibleErrors = errors.filter((e) => !/favicon|net::ERR_ABORTED/.test(e));
    check(
      'No console errors on desktop flow',
      visibleErrors.length === 0,
      visibleErrors.slice(0, 3).join(' | '),
    );
    await browser.close();
  }

  // ── mobile: list and stage widths ──
  {
    const { browser, page, errors } = await boot();
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await goto(page, '/games');
    const w1 = await page.evaluate(() => ({
      sw: document.documentElement.scrollWidth,
      iw: innerWidth,
      has: document.body.innerText.includes('CUBE/26'),
    }));
    check('Mobile games list shows CUBE/26', w1.has);
    check('Mobile games list has no horizontal overflow', w1.sw <= w1.iw + 1, `${w1.sw}/${w1.iw}`);

    await goto(page, '/games/cube-26/');
    const w2 = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth }));
    check('Mobile game page has no horizontal overflow', w2.sw <= w2.iw + 1, `${w2.sw}/${w2.iw}`);

    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => null),
      page.evaluate(() => {
        const b = [...document.querySelectorAll('button')].find((x) => /Play now/i.test(x.textContent || ''));
        if (b) b.click();
      }),
    ]);
    await sleep(5000);
    const m = await page.evaluate(() => ({
      path: location.pathname,
      title: document.title,
      canvas: document.querySelector('#stage')?.width || 0,
      sw: document.documentElement.scrollWidth,
      iw: innerWidth,
    }));
    check('Mobile Play now opens the full-page game', /^\/cube26\/?$/.test(m.path), m.path);
    check(
      'Mobile full-page game boots',
      /CUBE\/26/.test(m.title) && m.canvas > 0,
      `${m.title} · ${m.canvas}`,
    );
    check('Mobile game has no horizontal overflow', m.sw <= m.iw + 1, `${m.sw}/${m.iw}`);
    check(
      'No console errors on mobile flow',
      errors.filter((e) => !/favicon|net::ERR_ABORTED/.test(e)).length === 0,
      errors.slice(0, 2).join(' | '),
    );
    await browser.close();
  }

  // ── standalone app (same file set, no site chrome) ──
  {
    const { browser, page, errors } = await boot();
    await page.setViewport({ width: 1280, height: 800 });
    await goto(page, '/cube26/');
    const s = await page.evaluate(() => ({
      title: document.title,
      canvas: document.querySelector('#stage')?.width || 0,
      state: document.querySelector('#status')?.dataset.state || '',
    }));
    check('Standalone /cube26/ is the CUBE/26 app', /CUBE\/26/.test(s.title), s.title);
    check('Standalone canvas is live', s.canvas > 0, String(s.canvas));
    check('Standalone app not stuck booting', s.state && s.state !== 'booting', s.state);
    check(
      'No console errors standalone',
      errors.filter((e) => !/favicon|net::ERR_ABORTED/.test(e)).length === 0,
      errors.slice(0, 2).join(' | '),
    );
    await browser.close();
  }

  // ── home feed link ──
  {
    const { browser, page } = await boot();
    await page.setViewport({ width: 1440, height: 900 });
    await goto(page, '/');
    const home = await page.evaluate(() => ({
      has: document.body.innerText.includes('CUBE/26'),
      link: [...document.querySelectorAll('a[href^="/games/"]')].some((a) =>
        /cube-26/.test(a.getAttribute('href') || ''),
      ),
    }));
    check('Home feed surfaces CUBE/26', home.has && home.link);
    await browser.close();
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
