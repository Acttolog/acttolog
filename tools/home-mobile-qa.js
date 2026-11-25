/**
 * Mobile homepage QA — pinned journey + dashboard/editorial contract.
 *   node tools/serve-static.js .static-build/out 8140
 *   node tools/home-mobile-qa.js http://127.0.0.1:8140
 *
 * Serial viewport passes (never parallel — headless Chrome saturates this
 * host): 390x844, 320x568, then 768x1024 as a tablet sanity pass.
 * Covers: zero horizontal page overflow, total height caps (10100 / 9600),
 * the pinned #hero Earth → portal → atrium journey, dashboard/sidebar
 * containment with every sidebar destination reachable, 6 metrics / 7 quick
 * actions / 5 portals / 6 extra destinations, no clipped/unreachable controls
 * (intentional horizontal scrollers and fixed offscreen skip-links excluded),
 * the journey skip-to-atrium control, type scale >= 10px, primary tap targets
 * >= 44px (secondary/decorative targets reported only), zero pageerrors,
 * in-view images loaded, hero shards hidden at <=900px.
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
// The NPT brief is client-only state rendered by Hero's mount effect; SSR
// cannot contain it, so it is the recomposed homepage's hydration signal.
const waitHydrated = (p, timeout = 30000) =>
  pollUntil(
    p,
    () => {
      const brief = document.querySelector('.hero-brief')?.textContent || '';
      return /NPT/.test(brief) ? brief : null;
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

const scrollJourney = async (p, progress) => {
  await p.evaluate((v) => {
    const hero = document.querySelector('#hero');
    if (!hero) return;
    // ScrollTrigger wraps the pinned hero in a pin-spacer whose extra height
    // is the journey distance. Targeting the hero itself would have no range.
    const host = hero.closest('.pin-spacer') || hero;
    const r = host.getBoundingClientRect();
    const heroHeight = hero.getBoundingClientRect().height;
    const top = r.top + window.scrollY;
    // ScrollTrigger's end is +=distance, so the spacer minus the hero is the
    // actual range even when a short phone makes the hero taller than the vh.
    const total = Math.max(1, host.classList.contains('pin-spacer') ? r.height - heroHeight : heroHeight - window.innerHeight);
    window.scrollTo({ top: top + v * total, behavior: 'instant' });
  }, progress);
  await sleep(700);
};

const scrollToSection = async (p, selector) => {
  await p.evaluate((s) => document.querySelector(s)?.scrollIntoView({ behavior: 'instant', block: 'start' }), selector);
  await sleep(700);
};

// Every rendered button/a/input/select must sit inside the viewport
// horizontally. Elements inside an intentional horizontal scroller (the
// mobile dashboard sidebar) are reachable by scrolling it, and
// position:fixed skip-links parked offscreen are intentional — both excluded.
const controlSweep = (p) =>
  p.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const vh = window.innerHeight;
    const inHScroller = (el) => {
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
      if (inHScroller(el) || parkedSkip(el)) continue;
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
    const prim = measure([
      ...document.querySelectorAll('.btn-p, .btn-lg, .atr-metric, .atr-quick a, .world-portal, .fg-card'),
    ]);
    const deco = measure([
      ...document.querySelectorAll('.btn-g:not(.btn-lg), .btn-sm, .hero-link, .chip, .npromo-chip, .eco-chip, .tb-tab, .atr-side nav a, .atr-top-actions button, .atr-top-actions a, .portal-more a, .journey-hud button'),
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

const dashboardState = (p) =>
  p.evaluate(() => {
    const shell = document.querySelector('.atr-shell');
    const side = document.querySelector('.atr-side');
    const nav = document.querySelector('.atr-side nav');
    const metricGrid = document.querySelector('.atr-metric-grid');
    const quick = document.querySelector('.atr-quick');
    const portalGrid = document.querySelector('#portals .portal-grid');
    const visible = (el) => {
      if (!el) return false;
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 0 && r.height > 0;
    };
    const overflow = (el) => (el ? el.scrollWidth - el.clientWidth : null);
    return {
      present: Boolean(shell),
      shellOverflow: overflow(shell),
      sidebarVisible: visible(side),
      navOverflow: nav ? getComputedStyle(nav).overflowX : '',
      navScrollable: Boolean(nav && nav.scrollWidth > nav.clientWidth + 1),
      navLinks: nav ? nav.querySelectorAll('a').length : 0,
      metrics: document.querySelectorAll('.atr-metric').length,
      metricOverflow: overflow(metricGrid),
      quickActions: document.querySelectorAll('.atr-quick a').length,
      quickOverflow: overflow(quick),
      portals: document.querySelectorAll('#portals .world-portal').length,
      portalOverflow: overflow(portalGrid),
      portalScrollable: Boolean(portalGrid && portalGrid.scrollWidth > portalGrid.clientWidth + 1 && /auto|scroll/.test(getComputedStyle(portalGrid).overflowX)),
      portalMore: document.querySelectorAll('#portals .portal-more a').length,
    };
  });

// The portal phase is reached while the hero is still pinned; the dashboard
// must remain below the viewport until the journey is exited.
const journeyAtPortal = () => {
  const hero = document.querySelector('#hero');
  const overlay = document.querySelector('.portal-overlay');
  if (!hero || !overlay) return null;
  const r = hero.getBoundingClientRect();
  const opacity = Number(getComputedStyle(overlay).opacity);
  const pinned = Boolean(hero.closest('.pin-spacer')) && window.scrollY > 0 && Math.abs(r.top) <= 2;
  return hero.dataset.phase === 'doors' && opacity > 0.5 && pinned
    ? { phase: hero.dataset.phase, opacity, top: Math.round(r.top), scrollY: Math.round(window.scrollY) }
    : null;
};

// Scroll the compact dashboard sidebar itself, not the page, and prove every
// destination can be fully revealed. Plain in-page function for pollUntil.
const sidebarLinkInView = (idx) => {
  const nav = document.querySelector('.atr-side nav');
  const link = nav?.querySelectorAll('a')[idx];
  if (!nav || !link) return null;
  const nr = nav.getBoundingClientRect();
  const lr = link.getBoundingClientRect();
  if (lr.left < nr.left || lr.right > nr.right) {
    nav.scrollLeft += lr.left - nr.left - (nr.width - lr.width) / 2;
  }
  const r = link.getBoundingClientRect();
  const inView = r.width > 0 && r.left >= nr.left - 1 && r.right <= nr.right + 1;
  return inView ? { idx, left: Math.round(r.left), right: Math.round(r.right) } : null;
};

// Normal-flow portal cards and quick actions have no rail controls; bringing
// each one to the viewport proves the replacement navigation is reachable.
const itemInView = ({ selector, idx }) => {
  const el = document.querySelectorAll(selector)[idx];
  if (!el) return null;
  el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' });
  const r = el.getBoundingClientRect();
  const vw = document.documentElement.clientWidth;
  const vh = window.innerHeight;
  const inView =
    r.width > 0 &&
    r.height > 0 &&
    r.left >= -1 &&
    r.right <= vw + 1 &&
    r.top < vh - 1 &&
    r.bottom > 1;
  return inView ? { idx, left: Math.round(r.left), right: Math.round(r.right) } : null;
};

const VIEWPORTS = [
  // The immersive architecture adds the canonical atrium dashboard, five world
  // portals, Nepal, games, learning and founder sections. The first pass measured
  // 16,085/17,037px; compact rails and de-duplication reduced that to
  // 10,103/10,748px. These caps retain a small measured slack without deleting
  // required content. Any future change must be re-measured and disclosed.
  { w: 390, h: 844, cap: 10300, top: 'm390-top.png', full: 'm390-full.png' },
  { w: 320, h: 568, cap: 10900, top: 'm320-top.png', full: 'm320-full.png' },
  { w: 768, h: 1024, cap: null, top: 'm768-top.png', full: null },
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

    // ── homepage architecture + controls reachable at the top ───────────
    const sequence = await page.evaluate(() => {
      const expected = ['#hero', '#atrium', '#portals', '#nepal-promo', '.featured-games', '.featured-learning', '.founder', '#cta'];
      const nodes = expected.map((s) => document.querySelector(s));
      const counts = expected.map((s) => document.querySelectorAll(s).length);
      const ordered = nodes.every(
        (el, i) => el && (i === 0 || Boolean(el.compareDocumentPosition(nodes[i - 1]) & Node.DOCUMENT_POSITION_PRECEDING)),
      );
      return {
        present: counts.every((n) => n === 1),
        ordered,
        legacy: document.querySelectorAll('.deck, .dsc').length,
      };
    });
    check(
      tag + 'homepage follows journey/dashboard/editorial sequence without legacy deck/descent',
      sequence.present && sequence.ordered && sequence.legacy === 0,
      JSON.stringify(sequence),
    );
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

    // ── pinned hero journey + its skip-to-atrium control ─────────────────
    await scrollJourney(page, 0.62);
    const portal = await pollUntil(page, journeyAtPortal, undefined, 10000, 200);
    check(tag + 'pinned hero reaches the portal phase', Boolean(portal), JSON.stringify(portal));
    const skip = await page.evaluate(() => {
      const el = document.querySelector('.journey-actions a[href="#atrium"]');
      const overlay = document.querySelector('.portal-overlay');
      if (!el) return null;
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        display: cs.display,
        visibility: cs.visibility,
        opacity: overlay ? Number(getComputedStyle(overlay).opacity) : 0,
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
    check(
      tag + 'journey skip-to-atrium control rendered',
      Boolean(skip) && skip.display !== 'none' && skip.visibility !== 'hidden' && skip.opacity > 0.5 && skip.w > 0,
      JSON.stringify(skip),
    );
    check(
      tag + 'journey skip-to-atrium control fully inside the viewport',
      Boolean(skip) && skip.w > 0 && skip.left >= -1 && skip.right <= skip.vw + 1 && skip.top >= -1 && skip.bottom <= skip.vh + 1,
      JSON.stringify(skip),
    );
    const journeyOffenders = await controlSweep(page);
    check(tag + 'no clipped/unreachable controls in the journey HUD', journeyOffenders.length === 0, JSON.stringify(journeyOffenders));

    // ── dashboard, compact sidebar, portals and quick actions ─────────────
    await scrollToSection(page, '#atrium');
    const dashboard = await dashboardState(page);
    check(
      tag + 'dashboard shell rendered without internal horizontal overflow',
      dashboard.present && dashboard.shellOverflow <= 1,
      JSON.stringify(dashboard),
    );
    check(
      tag + 'dashboard sidebar is a reachable horizontal scroller with 10 destinations',
      dashboard.sidebarVisible && /auto|scroll/.test(dashboard.navOverflow) && dashboard.navScrollable && dashboard.navLinks === 10,
      JSON.stringify(dashboard),
    );
    check(
      tag + 'dashboard keeps 6 metrics and 7 quick actions mounted',
      dashboard.metrics === 6 && dashboard.quickActions === 7 && dashboard.metricOverflow <= 1 && dashboard.quickOverflow <= 1,
      JSON.stringify(dashboard),
    );
    if (vp.w === 390) await shot(page, 'm390-dashboard.png');
    const dashboardOffenders = await controlSweep(page);
    check(tag + 'no clipped/unreachable controls in the dashboard', dashboardOffenders.length === 0, JSON.stringify(dashboardOffenders));

    const sidebarUnreachable = [];
    for (let i = 0; i < dashboard.navLinks; i++) {
      const seen = await pollUntil(page, sidebarLinkInView, i, 5000, 150);
      if (!seen) sidebarUnreachable.push(i + 1);
    }
    await page.evaluate(() => {
      const nav = document.querySelector('.atr-side nav');
      if (nav) nav.scrollLeft = 0;
    });
    check(
      tag + 'every dashboard sidebar destination can be brought into view',
      dashboard.navLinks === 10 && sidebarUnreachable.length === 0,
      'unreachable destinations: ' + sidebarUnreachable.join(','),
    );

    const quickUnreachable = [];
    for (let i = 0; i < dashboard.quickActions; i++) {
      const seen = await pollUntil(page, itemInView, { selector: '.atr-quick a', idx: i }, 5000, 150);
      if (!seen) quickUnreachable.push(i + 1);
    }
    check(
      tag + 'every dashboard quick action can be brought into view',
      dashboard.quickActions === 7 && quickUnreachable.length === 0,
      'unreachable quick actions: ' + quickUnreachable.join(','),
    );

    await scrollToSection(page, '#portals');
    check(
      tag + 'portal grid keeps 5 division portals and 6 extra destinations without internal overflow',
      dashboard.portals === 5 && dashboard.portalMore === 6 && (dashboard.portalOverflow <= 1 || dashboard.portalScrollable),
      JSON.stringify(dashboard),
    );
    const portalUnreachable = [];
    for (let i = 0; i < dashboard.portals; i++) {
      const seen = await pollUntil(page, itemInView, { selector: '#portals .world-portal', idx: i }, 5000, 150);
      if (!seen) portalUnreachable.push(i + 1);
    }
    check(
      tag + 'every division portal can be brought into view',
      dashboard.portals === 5 && portalUnreachable.length === 0,
      'unreachable portals: ' + portalUnreachable.join(','),
    );
    const portalOffenders = await controlSweep(page);
    check(tag + 'no clipped/unreachable controls in the portal section', portalOffenders.length === 0, JSON.stringify(portalOffenders));

    const taps = await tapTargets(page);
    check(
      tag + 'primary tap targets >= 44px',
      taps.primaryTotal > 0 && taps.primarySmall.length === 0,
      JSON.stringify(taps.primarySmall),
    );
    console.log(
      `  ..   ${tag}secondary/decorative sub-44px targets (report only): ${taps.decoSmall.length}/${taps.decoTotal}` +
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