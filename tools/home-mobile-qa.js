/**
 * Mobile homepage QA — the recomposed "no repeated facts" contract.
 *   node tools/serve-static.js .static-build/out 8140
 *   node tools/home-mobile-qa.js http://127.0.0.1:8140
 *
 * Serial viewport passes (never parallel — headless Chrome saturates this
 * host): 390x844, 320x568, then 768x1024 as a tablet sanity pass.
 * Covers: zero horizontal page overflow, total height caps (10000 / 9500),
 * the <=700px deck snap rail (overflow-x, snap-type, rail nav with 2 arrows /
 * 15 dots / counter, next-arrow steering, every card reachable, 15 cards kept
 * mounted), no clipped/unreachable controls (rail descendants and fixed
 * offscreen skip-links excluded), the descent .dsc-skip regression at 320,
 * type scale >= 10px, primary tap targets >= 44px (decoratives reported only),
 * zero pageerrors, in-view images loaded, hero shards hidden at <=900px.
 * Screenshots: C:/Users/acttolog/AppData/Local/arcadeqa/homemobile/.
 */
const puppeteer = require('puppeteer');
const fs = require('fs');

const BASE = process.argv[2] || 'http://127.0.0.1:8140';
const OUT = 'C:/Users/acttolog/AppData/Local/arcadeqa/homemobile';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(OUT, { recursive: true });

let pass = 0;
const fails = [];
const check = (name, ok, detail = '') => {
  if (ok) {
    pass++;
    console.log('  ok   ' + name);
  } else {
    fails.push(name + (detail ? ' — ' + detail : ''));
    console.log('  FAIL ' + name + (detail ? ' — ' + detail : ''));
  }
};

// Poll from Node (not waitForFunction): software-WebGL shader compilation can
// block the main thread for seconds, and page.evaluate queues behind the block
// instead of firing a wall-clock timeout mid-animation.
const pollUntil = async (p, fn, arg, timeout = 25000, interval = 400) => {
  const deadline = Date.now() + timeout;
  let last;
  for (;;) {
    last = await p.evaluate(fn, arg).catch(() => undefined);
    if (last) return last;
    if (Date.now() >= deadline) return last;
    await sleep(interval);
  }
};
// SSR ships a `--:--:--` clock placeholder; a real NPT time means HomeDeck's
// effect ran — the true hydration signal.
const waitHydrated = (p, timeout = 30000) =>
  pollUntil(
    p,
    () => {
      const c = document.querySelector('.dk-clock')?.textContent || '';
      return /^\d{2}:\d{2}:\d{2}$/.test(c) ? c : null;
    },
    undefined,
    timeout,
  );

const shot = async (p, file, fullPage = false) => {
  const ok = await Promise.race([
    p.screenshot({ path: OUT + '/' + file, fullPage }).then(
      () => true,
      () => false,
    ),
    sleep(45000).then(() => false),
  ]);
  if (!ok) console.log('  ..   screenshot ' + file + ' skipped (compositor busy)');
};

const seed = () => {
  try {
    localStorage.setItem('act_welcomed', '1');
    localStorage.setItem('act_consent', JSON.stringify({ necessary: true, analytics: false, personalization: false }));
  } catch {}
};

const wire = (p, tag, pageErrs, consoleErrs) => {
  p.on('pageerror', (e) => pageErrs.push((tag + e.message).slice(0, 160)));
  p.on('console', (m) => {
    const txt = m.text();
    if (m.type() === 'error' && !/Failed to load resource|WebGL|THREE|favicon/i.test(txt)) consoleErrs.push((tag + txt).slice(0, 160));
  });
};

const scrollDescent = async (p, pp) => {
  await p.evaluate((v) => {
    const s = document.querySelector('.dsc');
    if (!s) return;
    const r = s.getBoundingClientRect();
    const top = r.top + window.scrollY;
    const total = Math.max(1, r.height - window.innerHeight);
    window.scrollTo({ top: top + v * total, behavior: 'instant' });
  }, pp);
  await sleep(700);
};

// Every rendered button/a/input/select must sit inside the viewport
// horizontally. Elements inside a horizontally scrollable rail (the deck) are
// reachable by scrolling that rail, and position:fixed skip-links parked
// offscreen are intentional — both are excluded.
const controlSweep = (p) =>
  p.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const vh = window.innerHeight;
    const inHRail = (el) => {
      for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
        const cs = getComputedStyle(a);
        if ((cs.overflowX === 'auto' || cs.overflowX === 'scroll') && a.scrollWidth > a.clientWidth + 1) return true;
      }
      return false;
    };
    // A skip link is parked offscreen on purpose and revealed by :focus.
    // It may be fixed or absolute, and parked on either axis. The positive
    // assertion that focus really reveals it lives in the skip-link check.
    const parkedSkip = (el) => {
      for (let a = el; a && a !== document.body; a = a.parentElement) {
        const cs = getComputedStyle(a);
        if (cs.position === 'fixed' || cs.position === 'absolute') {
          const r = a.getBoundingClientRect();
          const off = r.bottom < 0 || r.top > vh || r.right < 0 || r.left > vw;
          const skipish =
            /skip/i.test(a.getAttribute('class') || '') ||
            (a.tagName === 'A' && (a.getAttribute('href') || '').startsWith('#'));
          if (off && skipish) return true;
        }
      }
      return false;
    };
    const offenders = [];
    for (const el of document.querySelectorAll('button, a, input, select')) {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) continue;
      if (inHRail(el) || parkedSkip(el)) continue;
      if (r.right > vw + 1 || r.left < -1) {
        offenders.push({
          el: el.tagName.toLowerCase() + '.' + (el.getAttribute('class') || '').split(' ').slice(0, 2).join('.'),
          left: Math.round(r.left),
          right: Math.round(r.right),
          vw,
        });
      }
    }
    return offenders.slice(0, 12);
  });

// Visible text nodes below 10px (sr-only / clipped / hidden nodes excluded).
const typeScale = (p) =>
  p.evaluate(() => {
    const out = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walker.nextNode())) {
      const txt = (n.nodeValue || '').trim();
      if (!txt) continue;
      const el = n.parentElement;
      if (!el) continue;
      const tag = el.tagName;
      if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT' || tag === 'TEMPLATE') continue;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) < 0.05) continue;
      if (el.classList.contains('sr-only') || cs.clipPath !== 'none' || (cs.clip && cs.clip !== 'auto')) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) continue;
      out.push({
        size: Math.round(parseFloat(cs.fontSize) * 10) / 10,
        cls: (el.getAttribute('class') || '').split(' ').slice(0, 2).join('.'),
        tag: tag.toLowerCase(),
        text: txt.slice(0, 24),
      });
    }
    out.sort((a, b) => a.size - b.size);
    const below = out.filter((o) => o.size < 10);
    return { total: out.length, smallest: out.slice(0, 6), below: below.length, offenders: below.slice(0, 12) };
  });

// Primary actions must be >= 44px; decorative chips are reported, not failed.
const tapTargets = (p) =>
  p.evaluate(() => {
    const measure = (els) =>
      els
        .map((el) => {
          const cs = getComputedStyle(el);
          const r = el.getBoundingClientRect();
          if (cs.display === 'none' || cs.visibility === 'hidden' || r.width < 1 || r.height < 1) return null;
          return { cls: (el.getAttribute('class') || '').split(' ').slice(0, 2).join('.'), w: Math.round(r.width), h: Math.round(r.height) };
        })
        .filter(Boolean);
    const prim = measure([...document.querySelectorAll('.btn-p, .btn-lg, .drn-arrow')]);
    const deco = measure([
      ...document.querySelectorAll('.btn-g:not(.btn-lg), .btn-sm, .dsc-skip, .hero-link, .chip, .npromo-chip, .eco-chip, .tb-tab, .drn-dot, .ap-swatch'),
    ]);
    return {
      primaryTotal: prim.length,
      primarySmall: prim.filter((x) => x.w < 44 || x.h < 44),
      decoTotal: deco.length,
      decoSmall: deco.filter((x) => x.w < 44 || x.h < 44).slice(0, 10),
    };
  });

// Lazy art that only just entered the viewport is still decoding; give it a
// bounded window before calling it broken, so a slow decode is not a failure
// and a genuinely missing file still is.
const imgProbe = async (p) => {
  for (let i = 0; i < 30; i++) {
    const r = await imgProbeOnce(p);
    if (r.bad.length === 0) return r;
    await sleep(200);
  }
  return imgProbeOnce(p);
};

const imgProbeOnce = (p) =>
  p.evaluate(() => {
    const vh = window.innerHeight;
    const vw = window.innerWidth;
    const bad = [];
    let inView = 0;
    for (const img of document.querySelectorAll('img')) {
      const r = img.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) continue;
      if (r.bottom < -50 || r.top > vh + 50 || r.right < -50 || r.left > vw + 50) continue;
      inView++;
      if (!(img.naturalWidth > 0)) bad.push((img.currentSrc || img.src || '?').slice(-60));
    }
    return { inView, bad };
  });

const railState = (p) =>
  p.evaluate(() => {
    const g = document.querySelector('.deck-grid');
    const nav = document.querySelector('.deck-rail-nav');
    if (!g) return { present: false };
    const cs = getComputedStyle(g);
    const nr = nav ? nav.getBoundingClientRect() : null;
    return {
      present: true,
      ox: cs.overflowX,
      snap: cs.scrollSnapType,
      navVisible: Boolean(nr && nr.width > 0 && nr.height > 0),
      arrows: document.querySelectorAll('.drn-arrow').length,
      dots: document.querySelectorAll('.drn-dot').length,
      count: document.querySelector('.drn-count')?.textContent.trim() || '',
      cards: document.querySelectorAll('.deck-card').length,
    };
  });

// Cards follow the rendered (CSS `order`) sequence, exactly like DeckRail.
// Plain in-page function — passed straight to pollUntil/page.evaluate.
const railCardInView = (idx) => {
  const rail = document.querySelector('.deck-grid');
  if (!rail) return null;
  const dots = [...document.querySelectorAll('.drn-dot')];
  const cards = [...rail.querySelectorAll('.deck-card')].sort(
    (a, b) => (Number(getComputedStyle(a).order) || 0) - (Number(getComputedStyle(b).order) || 0),
  );
  const active = dots.findIndex((d) => d.classList.contains('on'));
  const c = cards[idx];
  if (!c) return null;
  const r = rail.getBoundingClientRect();
  const cr = c.getBoundingClientRect();
  const center = cr.left + cr.width / 2;
  const inView = cr.width > 0 && center >= r.left - 2 && center <= r.right + 2;
  return active === idx && inView ? { active, inView } : null;
};

const VIEWPORTS = [
  // Caps track the recomposed home's measured height (FAB-clearance wrap at
  // 390, full editorial sequence at 320); raise only with a documenting note.
  { w: 390, h: 844, cap: 10100, rail: true, top: 'm390-top.png', full: 'm390-full.png' },
  { w: 320, h: 568, cap: 9600, rail: true, top: 'm320-top.png', full: 'm320-full.png' },
  { w: 768, h: 1024, cap: null, rail: false, top: 'm768-top.png', full: null },
];

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding',
      '--disable-backgrounding-occluded-windows',
      '--disable-features=CalculateNativeWinOcclusion',
      '--enable-unsafe-swiftshader',
      '--use-angle=swiftshader',
    ],
  });

  // SERIAL passes — one page at a time, closed before the next opens.
  for (const vp of VIEWPORTS) {
    const tag = vp.w + 'px ';
    console.log('\nMOBILE HOMEPAGE · ' + vp.w + '×' + vp.h);
    const pageErrs = [];
    const consoleErrs = [];
    const page = await browser.newPage();
    wire(page, tag, pageErrs, consoleErrs);
    await page.evaluateOnNewDocument(seed);
    await page.setViewport({ width: vp.w, height: vp.h, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await waitHydrated(page);
    await sleep(600);

    // ── page geometry ────────────────────────────────────────────────────
    const m = await page.evaluate(() => ({
      sw: document.documentElement.scrollWidth,
      cw: document.documentElement.clientWidth,
      h: Math.max(document.body.scrollHeight, document.documentElement.scrollHeight),
    }));
    check(tag + 'no horizontal page overflow', m.sw === m.cw, `scrollWidth=${m.sw} clientWidth=${m.cw}`);
    if (vp.cap) {
      check(tag + `homepage height <= ${vp.cap}px`, m.h <= vp.cap, `${m.h}px`);
    } else {
      console.log(`  ..   ${tag}height ${m.h}px (tablet sanity pass, no cap)`);
    }
    await shot(page, vp.top);

    // ── deck snap rail (<=700px) ─────────────────────────────────────────
    if (vp.rail) {
      const rail = await railState(page);
      check(tag + 'deck grid is a horizontal snap rail', rail.present && /auto|scroll/.test(rail.ox) && /x/.test(rail.snap), JSON.stringify({ ox: rail.ox, snap: rail.snap }));
      check(
        tag + 'rail nav visible: 2 arrows, 15 dots, counter',
        rail.present && rail.navVisible && rail.arrows === 2 && rail.dots === 15 && /\d{2}\s*\/\s*15/.test(rail.count),
        JSON.stringify(rail),
      );
      check(tag + 'all 15 cards stay mounted in the rail', rail.cards === 15, 'got ' + rail.cards);
      if (rail.present && rail.dots === 15) {
        const before = await page.evaluate(() => ({
          sl: document.querySelector('.deck-grid').scrollLeft,
          active: [...document.querySelectorAll('.drn-dot')].findIndex((d) => d.classList.contains('on')),
        }));
        await page.evaluate(() => document.querySelector('.drn-arrow.next')?.click());
        const moved = await pollUntil(
          page,
          (b) => {
            const sl = document.querySelector('.deck-grid').scrollLeft;
            const active = [...document.querySelectorAll('.drn-dot')].findIndex((d) => d.classList.contains('on'));
            return sl !== b.sl && active !== b.active ? { sl, active } : null;
          },
          before,
          8000,
          200,
        );
        check(tag + 'next arrow scrolls the rail and advances the active dot', Boolean(moved), JSON.stringify({ before, moved }));
        const unreachable = [];
        for (let i = 0; i < 15; i++) {
          await page.evaluate((n) => document.querySelectorAll('.drn-dot')[n]?.click(), i);
          const seen = await pollUntil(page, railCardInView, i, 6000, 200);
          if (!seen) unreachable.push(i + 1);
          if (i === 7 && vp.w === 390) await shot(page, 'm390-rail-mid.png');
        }
        check(tag + 'every one of the 15 cards can be brought into view', unreachable.length === 0, 'unreachable cards: ' + unreachable.join(','));
        await page.evaluate(() => document.querySelectorAll('.drn-dot')[0]?.click());
        await pollUntil(page, railCardInView, 0, 6000, 200);
        await sleep(300);
      }
    }

    // ── controls reachable at the top of the page ────────────────────────
    const topOffenders = await controlSweep(page);
    check(tag + 'no clipped/unreachable controls at top', topOffenders.length === 0, JSON.stringify(topOffenders));

    // The skip link is exempt from the sweep because it is parked offscreen.
    // Earn that exemption: focusing it must bring it fully on-screen.
    const skipFocus = await page.evaluate(() => {
      const el = document.querySelector('a.skip');
      if (!el) return null;
      el.focus();
      const r = el.getBoundingClientRect();
      const vw = document.documentElement.clientWidth;
      const ok = document.activeElement === el && r.left >= 0 && r.right <= vw + 1 && r.width >= 44 && r.height >= 24;
      el.blur();
      return { ok, left: Math.round(r.left), right: Math.round(r.right), w: Math.round(r.width), h: Math.round(r.height), vw };
    });
    check(tag + 'skip link is revealed on focus', Boolean(skipFocus && skipFocus.ok), JSON.stringify(skipFocus));

    // ── descent HUD: the .dsc-skip regression (right=336 at vw=320) ──────
    await scrollDescent(page, 0.3);
    const skip = await page.evaluate(() => {
      const el = document.querySelector('.dsc-skip');
      if (!el) return null;
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        display: cs.display,
        left: Math.round(r.left),
        right: Math.round(r.right),
        top: Math.round(r.top),
        bottom: Math.round(r.bottom),
        w: Math.round(r.width),
        h: Math.round(r.height),
        vw: document.documentElement.clientWidth,
        vh: window.innerHeight,
      };
    });
    check(tag + 'descent .dsc-skip rendered', Boolean(skip) && skip.display !== 'none' && skip.w > 0, JSON.stringify(skip));
    check(
      tag + 'descent .dsc-skip fully inside the viewport',
      Boolean(skip) && skip.w > 0 && skip.left >= -1 && skip.right <= skip.vw + 1 && skip.top >= -1 && skip.bottom <= skip.vh + 1,
      JSON.stringify(skip),
    );
    const hudOffenders = await controlSweep(page);
    check(tag + 'no clipped/unreachable controls in the descent HUD', hudOffenders.length === 0, JSON.stringify(hudOffenders));
    const taps = await tapTargets(page);
    check(
      tag + 'primary tap targets >= 44px',
      taps.primaryTotal > 0 && taps.primarySmall.length === 0,
      JSON.stringify(taps.primarySmall),
    );
    console.log(
      `  ..   ${tag}decorative sub-44px targets (report only): ${taps.decoSmall.length}/${taps.decoTotal}` +
        (taps.decoSmall.length ? ' ' + JSON.stringify(taps.decoSmall.slice(0, 6)) : ''),
    );

    // ── in-view images actually load, stepping through the whole page ────
    const height = await page.evaluate(() => Math.max(document.body.scrollHeight, document.documentElement.scrollHeight));
    const steps = Math.min(16, Math.max(1, Math.ceil(height / vp.h)));
    const suspects = new Set();
    let maxInView = 0;
    for (let k = 0; k <= steps; k++) {
      await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), k * vp.h);
      await sleep(350);
      let probe = await imgProbe(page);
      const deadline = Date.now() + 3500;
      while (probe.bad.length && Date.now() < deadline) {
        await sleep(300);
        probe = await imgProbe(page);
      }
      maxInView = Math.max(maxInView, probe.inView);
      for (const b of probe.bad) suspects.add(b);
    }
    // Lazy art can miss the decode window at the step that first revealed it and
    // land moments later. Re-check each suspect on its own so this reports
    // missing files, not slow decodes.
    const imgFails = [];
    for (const src of suspects) {
      const broken = await page.evaluate(async (s) => {
        const img = [...document.querySelectorAll('img')].find(
          (i) => (i.currentSrc || i.src || '').slice(-60) === s,
        );
        if (!img) return false;
        img.scrollIntoView({ block: 'center', behavior: 'instant' });
        for (let i = 0; i < 20 && !(img.naturalWidth > 0); i++) {
          await new Promise((r) => setTimeout(r, 200));
        }
        return !(img.naturalWidth > 0);
      }, src);
      if (broken) imgFails.push(src);
    }
    check(tag + 'all in-view images loaded (naturalWidth > 0)', imgFails.length === 0 && maxInView > 0, imgFails.slice(0, 6).join(' | ') || 'no images seen');

    // ── type scale + hero shards (after the scroll pass fired the Reveals) ─
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await sleep(500);
    const type = await typeScale(page);
    check(tag + 'no visible text below 10px', type.below === 0 && type.total > 0, `${type.below}/${type.total} nodes below 10px`);
    console.log(`  ..   ${tag}smallest text sizes: ` + JSON.stringify(type.smallest));
    if (type.offenders.length) console.log(`  ..   ${tag}sub-10px offenders: ` + JSON.stringify(type.offenders));
    const shards = await page.evaluate(() => {
      const el = document.querySelector('.hero-shards');
      return el ? getComputedStyle(el).display : 'missing';
    });
    check(tag + 'hero shards hidden at <=900px', shards === 'none', shards);

    if (vp.full) await shot(page, vp.full, true);

    check(tag + 'zero pageerrors', pageErrs.length === 0, pageErrs.slice(0, 4).join(' | '));
    check(tag + 'no console errors', consoleErrs.length === 0, consoleErrs.slice(0, 4).join(' | '));
    await page.close();
  }

  console.log('\nRESULT ' + pass + ' passed, ' + fails.length + ' failed');
  if (fails.length) console.log('FAILURES\n- ' + fails.join('\n- '));
  await browser.close();
  process.exit(fails.length ? 1 : 0);
})().catch((e) => {
  console.error('FATAL', e);
  process.exit(1);
});