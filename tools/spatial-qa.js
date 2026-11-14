/**
 * ACTTOLOG spatial-view QA — exercises the CSS-3D plate system and the
 * full-screen ring deck on desktop and mobile.
 */
const puppeteer = require('puppeteer');
const fs = require('fs');

const BASE = process.argv[2] || 'http://127.0.0.1:3100';
const OUT = process.cwd() + '/qa-shots/spatial';
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let pass = 0,
  fail = 0;
const errors = [];
const check = (name, ok, extra = '') => {
  ok ? pass++ : fail++;
  console.log(`${ok ? '✅' : '❌'} ${name}${extra ? ' — ' + extra : ''}`);
};

(async () => {
  const browser = await puppeteer.launch({
    headless: 'shell',
    protocolTimeout: 600000,
    args: [
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu-sandbox',
      '--enable-unsafe-swiftshader',
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--blink-settings=primaryHoverType=2,primaryPointerType=4,availableHoverTypes=2,availablePointerTypes=4',
    ],
  });

  let page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
  page.setDefaultTimeout(120000);
  page.on('pageerror', (e) => errors.push('pageerror: ' + String(e).slice(0, 160)));
  page.on('console', (m) => {
    if (
      m.type() === 'error' &&
      !/tile\.openstreetmap|nominatim|overpass|arcgisonline|unpkg|Failed to load resource|net::ERR/i.test(
        m.text(),
      )
    ) {
      errors.push('console: ' + m.text().slice(0, 160));
    }
  });
  const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` }).catch(() => {});
  const ensurePage = async () => {
    if (page && !page.isClosed()) return;
    console.log('   (renderer died — recreating page)');
    page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
    page.setDefaultTimeout(120000);
    page.on('pageerror', (e) => errors.push('pageerror: ' + String(e).slice(0, 160)));
  };
  const step = async (label, fn) => {
    try {
      await fn();
    } catch (e) {
      fail++;
      console.log(`❌ STEP ${label} crashed — ${String(e.message || e).slice(0, 160)}`);
      await ensurePage().catch(() => {});
    }
  };
  const dismiss = async () => {
    await page.evaluate(() => {
      [...document.querySelectorAll('#consent button')]
        .find((b) => /Necessary only/i.test(b.textContent))
        ?.click();
    });
    const home = await page.evaluate(() => location.pathname === '/');
    if (home) {
      await sleep(1300); // FirstVisit mounts ~900 ms after consent
      await page.evaluate(() => {
        [...document.querySelectorAll('.fv-card button')].find((b) => /Skip/i.test(b.textContent))?.click();
      });
    }
    await sleep(400);
  };
  const clickText = (selector, text) =>
    page.evaluate(
      (sel, wanted) => {
        const el = [...document.querySelectorAll(sel)].find((n) =>
          new RegExp(wanted, 'i').test(n.textContent || ''),
        );
        if (!el) return false;
        el.click();
        return true;
      },
      selector,
      text,
    );

  // ── 1. Homepage plates ───────────────────────────────────────────
  await step('home', async () => {
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    await sleep(1800);
    await dismiss();
    const media = await page.evaluate(() => ({
      fine: matchMedia('(hover: hover) and (pointer: fine)').matches,
      frames: document.querySelectorAll('.sp-frame').length,
      planes: document.querySelectorAll('.sp-frame > .sp-plane').length,
      view: CSS.supports('animation-timeline: view()'),
      beam: !!document.querySelector('.scrollbeam'),
      warp: !!document.querySelector('.page-warp'),
    }));
    check(
      'Homepage renders 3D plates',
      media.frames >= 12,
      `${media.frames} frames / ${media.planes} planes`,
    );
    check('Homepage has page-warp + scroll beam', media.beam && media.warp);
    check('Fine-pointer media query active in QA', media.fine);

    await page.evaluate(() => {
      document.querySelector('#intro .sp-frame')?.scrollIntoView({ block: 'center', behavior: 'instant' });
    });
    await sleep(800);
    const frame = await page.evaluate(() => {
      const el = document.querySelector('#intro .sp-frame');
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const x = r.x + r.width * 0.85;
      const y = r.y + r.height * 0.2;
      const hit = document.elementFromPoint(x, y);
      return {
        x,
        y,
        w: r.width,
        h: r.height,
        transformStyle: getComputedStyle(el.querySelector('.sp-plane')).transformStyle,
        hit: !!hit && hit.closest('.sp-frame') === el,
      };
    });
    check(
      'Intro plate owns layout and a preserve-3d plane',
      !!frame && frame.w > 200 && frame.h > 200 && frame.transformStyle === 'preserve-3d' && frame.hit,
      frame
        ? `${Math.round(frame.w)}×${Math.round(frame.h)} ${frame.transformStyle} hit=${frame.hit}`
        : 'missing',
    );
    if (frame) {
      await page.mouse.move(frame.x - 40, frame.y - 40);
      await sleep(120);
      await page.mouse.move(frame.x, frame.y, { steps: 4 });
      await sleep(240);
      const vars = await page.evaluate(() => {
        const el = document.querySelector('#intro .sp-frame');
        return {
          rx: el.style.getPropertyValue('--sp-rx'),
          ry: el.style.getPropertyValue('--sp-ry'),
          live: el.dataset.live,
        };
      });
      check(
        'Pointer tilt writes real CSS-3D angles',
        Math.abs(parseFloat(vars.rx)) > 0.5 && Math.abs(parseFloat(vars.ry)) > 0.5 && vars.live === 'true',
        `rx=${vars.rx} ry=${vars.ry}`,
      );
    }
    check('Native scroll-driven animation supported', media.view);
    const drift = await page.evaluate(() => {
      const img = document.querySelector('#intro .sp-plane > img');
      return img ? getComputedStyle(img).animationName : '';
    });
    check('Image plates carry scroll-driven drift', drift === 'sp-drift', drift || 'none');
    await shot('01-home-plates');
  });

  // ── 2. Deck open / navigate / close ──────────────────────────────
  await step('deck', async () => {
    await page.evaluate(() => window.scrollTo(0, 0));
    await sleep(500);
    const opened = await clickText('button', 'SPATIAL VIEW');
    check('Hero SPATIAL VIEW trigger exists and clicks', opened);
    await sleep(500);
    const state = await page.evaluate(() => ({
      dialog: !!document.querySelector('.spv[role="dialog"]'),
      lock: document.documentElement.hasAttribute('data-spatial-open'),
      overflow: getComputedStyle(document.documentElement).overflow,
      cards: document.querySelectorAll('.spv-card').length,
      active: document.querySelectorAll('.spv-slot.on').length,
      count: document.querySelector('.spv-count')?.textContent.replace(/\s+/g, ' ').trim(),
      rot: document.querySelector('.spv-ring')?.style.getPropertyValue('--spv-rot'),
    }));
    check('Spatial deck opens as a modal', state.dialog && state.lock && state.overflow === 'hidden');
    check(
      'Deck holds seven world plates, one active',
      state.cards === 7 && state.active === 1,
      `${state.cards} cards`,
    );
    check('Counter starts at 01 / 07', state.count === '01 / 07', state.count);

    await page.keyboard.press('ArrowRight');
    await sleep(300);
    const next = await page.evaluate(() => ({
      count: document.querySelector('.spv-count')?.textContent.replace(/\s+/g, ' ').trim(),
      rot: document.querySelector('.spv-ring')?.style.getPropertyValue('--spv-rot'),
    }));
    check('Arrow-right orbits to plate 02', next.count === '02 / 07', next.count);
    check(
      'Ring rotation follows the active plate',
      Math.abs(parseFloat(next.rot) + 51.4286) < 0.01,
      next.rot,
    );
    await shot('02-deck');

    await page.evaluate(() => document.querySelectorAll('.spv-dots button')[4]?.click());
    await sleep(300);
    const dot = await page.evaluate(() =>
      document.querySelector('.spv-count')?.textContent.replace(/\s+/g, ' ').trim(),
    );
    check('Dot navigation jumps to plate 05', dot === '05 / 07', dot);

    await page.keyboard.press('Escape');
    await sleep(900);
    const closed = await page.evaluate(() => ({
      dialog: !!document.querySelector('.spv'),
      lock: document.documentElement.hasAttribute('data-spatial-open'),
      focus: document.activeElement?.textContent?.replace(/\s+/g, ' ').trim().slice(0, 40),
    }));
    check('Escape closes the deck and unlocks scroll', !closed.dialog && !closed.lock);
    check('Focus returns to the trigger', /SPATIAL VIEW/i.test(closed.focus || ''), closed.focus);
  });

  // ── 3. PageHead trigger + navigation close ───────────────────────
  await step('academy', async () => {
    await page.goto(BASE + '/academy', { waitUntil: 'domcontentloaded' });
    await sleep(1800);
    await dismiss();
    const head = await page.evaluate(() => ({
      trigger: !!document.querySelector('.sp-head-trigger'),
      frames: document.querySelectorAll('.sp-frame').length,
      overflow: document.documentElement.scrollWidth <= innerWidth + 1,
    }));
    check('/academy exposes the PageHead spatial trigger', head.trigger);
    check('/academy courses use 3D plates', head.frames >= 4, `${head.frames} frames`);
    check('/academy has no horizontal overflow', head.overflow);
    await clickText('.sp-head-trigger', 'SPATIAL VIEW');
    await sleep(500);
    check('PageHead trigger opens the deck', await page.evaluate(() => !!document.querySelector('.spv')));
    await shot('04-academy-deck');

    const href = await page.evaluate(() =>
      document.querySelector('.spv-slot.on .spv-card')?.getAttribute('href'),
    );
    await page.evaluate(() => document.querySelector('.spv-slot.on .spv-card')?.click());
    await sleep(1800);
    const after = await page.evaluate(() => ({
      path: location.pathname,
      dialog: !!document.querySelector('.spv'),
      lock: document.documentElement.hasAttribute('data-spatial-open'),
    }));
    check(
      'Active plate navigates to a real route',
      !!href && after.path !== '/academy',
      `${href} → ${after.path}`,
    );
    check('Deck closes across a route change', !after.dialog && !after.lock);
  });

  // ── 4. Coverage of division surfaces ─────────────────────────────
  const routes = [
    ['/blog', 4, 'blog'],
    ['/entertainment', 5, 'entertainment'],
    ['/games', 3, 'games'],
    ['/offers/thesyn-silver', 1, 'offer detail'],
    ['/nepal', 12, 'Nepal tourism'],
  ];
  for (const [route, min, label] of routes) {
    await step(route, async () => {
      await page.goto(BASE + route, { waitUntil: 'domcontentloaded' });
      await sleep(1600);
      await dismiss();
      const info = await page.evaluate(() => ({
        frames: document.querySelectorAll('.sp-frame').length,
        planes: document.querySelectorAll('.sp-plane').length,
        overflow: document.documentElement.scrollWidth <= innerWidth + 1,
      }));
      check(`${label} uses 3D image plates`, info.frames >= min, `${info.frames} frames`);
      check(`${label} has no horizontal overflow`, info.overflow);
    });
  }
  await page.evaluate(() => {
    const gal = document.querySelector('.np-gal');
    if (gal) window.scrollTo({ top: gal.getBoundingClientRect().top + scrollY - 90, behavior: 'instant' });
  });
  await sleep(2000);
  await shot('05-nepal-plates');

  // ── 5. Mobile deck ───────────────────────────────────────────────
  await step('mobile', async () => {
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    await sleep(1800);
    await dismiss();
    const frames = await page.evaluate(() => document.querySelectorAll('.sp-frame').length);
    check('Mobile still renders the image plates', frames >= 12, `${frames} frames`);
    const opened = await clickText('button', 'SPATIAL VIEW');
    check('Mobile hero trigger opens the deck', opened);
    await sleep(500);
    const fit = await page.evaluate(() => {
      const deck = document.querySelector('.spv');
      const card = document.querySelector('.spv-slot.on .spv-card');
      if (!deck || !card) return null;
      const d = deck.getBoundingClientRect();
      const c = card.getBoundingClientRect();
      return {
        w: Math.round(d.width),
        h: Math.round(d.height),
        inside: c.left >= -2 && c.right <= innerWidth + 2 && c.top >= 0 && c.bottom <= innerHeight + 2,
        scrollX: document.documentElement.scrollWidth <= innerWidth + 1,
      };
    });
    check(
      'Mobile deck fills the viewport',
      !!fit && fit.w === 390 && fit.h === 844,
      fit ? `${fit.w}×${fit.h}` : 'missing',
    );
    check('Active card fits the mobile viewport', !!fit && fit.inside);
    check('Mobile deck has no horizontal overflow', !!fit && fit.scrollX);
    await page.evaluate(() => document.querySelector('.spv-nav.next')?.click());
    await sleep(300);
    const mobileCount = await page.evaluate(() =>
      document.querySelector('.spv-count')?.textContent.replace(/\s+/g, ' ').trim(),
    );
    check('Mobile next control orbits the ring', mobileCount === '02 / 07', mobileCount);
    await shot('06-mobile-deck');
    await page.keyboard.press('Escape');
    await sleep(400);
    await page.evaluate(() => window.scrollTo(0, 0));
    await shot('07-mobile-home');
  });

  const unique = [...new Set(errors)];
  check('No runtime errors across the run', unique.length === 0, unique.slice(0, 3).join(' | '));

  console.log(`\n${pass} passed, ${fail} failed`);
  await browser.close();
  process.exit(fail ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(2);
});
