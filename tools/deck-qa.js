/**
 * Homepage + Design Lab QA — atrium/portals architecture.
 *   node tools/serve-static.js .static-build/out 8140
 *   DECK_BASE=http://127.0.0.1:8140 node tools/deck-qa.js
 * Covers: real atrium metrics/charts, SourceLedger, LiveWire, NoticeBoard,
 * five world portals, featured direct-play games, founder guide, global search,
 * five-tool bench at /design-lab#instruments, appearance at #appearance,
 * pointer studio at #pointer, device pulse at #diagnostics, Loksewa/offers/
 * Nepal destination counts, NE, responsive 390/320/768/1280 layouts, OS
 * reduced-motion, console/page errors.
 */
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE = process.env.DECK_BASE || 'http://127.0.0.1:8140';
const OUT = process.env.DECK_OUT || 'C:/Users/acttolog/AppData/Local/arcadeqa/deck';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(OUT, { recursive: true });

// Mirror the real content ledger rather than keeping hand-written figures.
// This is the signed-out pub() filter from src/lib/content/index.ts, including
// the curated extensions merge. gamesExtra is not merged into db.games.
const seed = require(path.join(__dirname, '..', 'src', 'lib', 'content', 'seed.json'));
const ext = require(path.join(__dirname, '..', 'src', 'lib', 'content', 'extensions.json'));
const sources = require(path.join(__dirname, '..', 'src', 'lib', 'content', 'sources.json'));
const loksewa = require(path.join(__dirname, '..', 'src', 'lib', 'content', 'loksewa.json'));
const nepal = require(path.join(__dirname, '..', 'src', 'lib', 'content', 'nepal.json'));
const drMerged = [...seed.dr];
for (const r of ext.drExtra || []) {
  const id = `dr_${r.slug}`;
  if (!drMerged.some((x) => x.id === id)) drMerged.push({ ...r, id, status: 'published', visible: true });
}
const offersMerged = seed.offers.map((o) => ({ ...o, ...(ext.offerPriceOverrides?.[o.slug] || {}) }));
for (const o of ext.newOffers || []) {
  if (!offersMerged.some((x) => x.id === o.id)) offersMerged.push(o);
}
const published = (list) =>
  (Array.isArray(list) ? list : [])
    .filter((x) => {
      if (x.visible === false) return false;
      if (x.status === 'scheduled') {
        const at = x.publishAt ? new Date(x.publishAt).getTime() : 0;
        return Boolean(at && at <= Date.now());
      }
      return (x.status ?? 'published') === 'published';
    })
    .filter((x) => !x.audience || x.audience !== 'members');
const pubCount = (list) => published(list).length;
const DIVISIONS = seed.divisions.filter((d) => d.visible !== false).sort((a, b) => a.order - b.order);
const COUNTS = {
  research: pubCount(seed.services),
  entertainment: pubCount(seed.entertainment),
  academy: pubCount(seed.academy && seed.academy.courses),
  games: pubCount(seed.games),
  darkroom: pubCount(drMerged),
  posts: pubCount(seed.posts),
};
// Atrium metric order: divisions, services, games, courses, resources, posts.
const METRIC_LEDGER = [DIVISIONS.length, COUNTS.research, COUNTS.games, COUNTS.academy, COUNTS.darkroom, COUNTS.posts];
const METRIC_ROUTES = ['#portals', '/research', '/games', '/academy', '/darkroom', '/blog'];
const DISTRIBUTION_LEDGER = [COUNTS.research, COUNTS.academy, COUNTS.games, COUNTS.darkroom, COUNTS.entertainment];
const PORTAL_COUNTS = DIVISIONS.map((d) => COUNTS[d.id]);
const QUICK_IDS = ['snake-himalaya', 'himalaya-breakout', 'danphe-flight', 'memory-nepal', 'himalaya-stack', 'ludo-himalaya'];
const QUICK_GAMES = QUICK_IDS.map((id) => published(seed.games).find((g) => g.slug === id)).filter(Boolean);
const QUICK_URLS = QUICK_GAMES.map((g) => g.url);
const OFFERS = published(offersMerged);
const LOKSEWA_COUNTS = {
  papers: loksewa.papers.length,
  subjects: loksewa.papers.reduce((n, p) => n + p.subjects.length, 0),
  folders: loksewa.papers.reduce((n, p) => n + p.subjects.reduce((m, s) => m + s.units.length, 0), 0),
  points: loksewa.papers.reduce((n, p) => n + p.subjects.reduce((m, s) => m + s.units.reduce((k, u) => k + u.points.length, 0), 0), 0),
  laws: loksewa.laws.length,
  questions: loksewa.practice.length,
};
const NEPAL_FACTS = [nepal.places.filter((p) => p.unesco).length, nepal.treks.length, nepal.permits.length];
const NEPAL_TOTALS = { regions: nepal.regions.length, places: nepal.places.length };

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

// React-controlled inputs need the native value setter + an input event.
const setVal = (page, sel, value) =>
  page.evaluate(
    (s, v) => {
      const el = document.querySelector(s);
      if (!el) return false;
      const desc = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value');
      desc.set.call(el, v);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    },
    sel,
    value,
  );

const clickText = (page, sel, txt) =>
  page.evaluate(
    (s, t) => {
      const el = [...document.querySelectorAll(s)].find((x) => x.textContent.trim() === t);
      if (!el) return false;
      el.click();
      return true;
    },
    sel,
    txt,
  );

const clickTab = (page, i) => page.evaluate((n) => document.querySelectorAll('#instruments .tb-tab')[n]?.click(), i);
const clickTheme = (page, label, id, timeout = 12000) =>
  pollUntil(
    page,
    (arg) => {
      const swatch = [...document.querySelectorAll('#appearance .ap-swatch')].find((x) => x.getAttribute('aria-label') === arg.label);
      if (!swatch) return null;
      swatch.click();
      return document.documentElement.getAttribute('data-theme') === arg.id &&
        swatch.getAttribute('aria-pressed') === 'true' &&
        localStorage.getItem('act_theme') === arg.id
        ? arg.id
        : null;
    },
    { label, id },
    timeout,
  );
const chooseCurrency = (page, currency, timeout = 12000) =>
  pollUntil(
    page,
    (cur) => {
      const button = [...document.querySelectorAll('.chip')].find((b) => b.textContent.trim() === (cur === 'NPR' ? 'NPR रु' : 'USD $'));
      if (!button) return null;
      button.click();
      return button.classList.contains('on') && localStorage.getItem('act_cur') === cur ? cur : null;
    },
    currency,
    timeout,
  );

// Headless software-WebGL can block the renderer while shaders compile, which
// makes in-page rAF/waitForFunction timeouts unreliable. Poll from Node so each
// evaluate queues behind the block and reads the settled value.
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

// LiveWire ships ISO dates in SSR HTML and changes all four to relative stamps
// only after its effect runs. That is the homepage hydration signal now that
// the old deck clock is gone.
const waitHomeHydrated = (p, timeout = 40000) =>
  pollUntil(
    p,
    () => {
      const dates = [...document.querySelectorAll('#atrium .atr-signals .wire .dk-feed-date')].map((d) => d.textContent.trim());
      return dates.length === 4 && dates.every((d) => d && !/^\d{4}-\d{2}-\d{2}$/.test(d)) ? dates : null;
    },
    undefined,
    timeout,
  );
const waitLabHydrated = (p, timeout = 30000) =>
  pollUntil(
    p,
    () => {
      const roots = ['appearance', 'pointer', 'instruments', 'diagnostics'];
      const vals = [...document.querySelectorAll('#diagnostics .pulse-v')].map((v) => v.textContent.trim());
      return roots.every((id) => document.querySelector('#' + id)) &&
        vals.length === 7 &&
        vals[2]?.startsWith(window.innerWidth + '×') &&
        vals[3] !== '—' &&
        vals[6] !== '—'
        ? vals
        : null;
    },
    undefined,
    timeout,
  );
const responsiveLayout = (p) =>
  p.evaluate(() => {
    const columns = (sel) => {
      const el = document.querySelector(sel);
      return el ? getComputedStyle(el).gridTemplateColumns.split(/\s+/).filter(Boolean).length : 0;
    };
    const shell = document.querySelector('.atr-shell');
    const nav = document.querySelector('.atr-side nav');
    const portalGrid = document.querySelector('.portal-grid');
    const gameGrid = document.querySelector('.fg-grid');
    const rail = (el) => Boolean(el && getComputedStyle(el).display === 'flex' && el.scrollWidth > el.clientWidth + 1 && /auto|scroll/.test(getComputedStyle(el).overflowX));
    return {
      docFits: document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
      shellFits: !!shell && shell.scrollWidth <= shell.clientWidth + 1,
      atriumDisplay: shell ? getComputedStyle(shell).display : '',
      navOverflow: nav ? getComputedStyle(nav).overflowX : '',
      portalColumns: columns('.portal-grid'),
      gameColumns: columns('.fg-grid'),
      portalRail: rail(portalGrid),
      gameRail: rail(gameGrid),
      portals: document.querySelectorAll('.world-portal').length,
      games: document.querySelectorAll('.fg-card').length,
    };
  });

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
  const page = await browser.newPage();
  const errs = [];
  const wire = (p, tag = '') => {
    // Static hosts intentionally fall back from a missing search API to the
    // bundled index. Ignore only that expected 404, plus Next's absent RSC
    // payloads; real asset failures and JS exceptions still fail the run.
    p.on('response', (r) => {
      const u = r.url();
      const expectedSearchFallback = r.status() === 404 && /\/api\/search(?:[?#]|$)/.test(u);
      const expectedNextFallback = /__next\.[^/]*\.txt|[?&]_rsc=|favicon/i.test(u);
      if (r.status() >= 400 && !expectedSearchFallback && !expectedNextFallback) errs.push((tag + r.status() + ' ' + u).slice(0, 160));
    });
    p.on('console', (m) => {
      const txt = m.text();
      if (m.type() === 'error' && !/Failed to load resource|WebGL|THREE|favicon/i.test(txt)) errs.push((tag + txt).slice(0, 160));
    });
    p.on('pageerror', (e) => {
      if (!/WebGL|THREE/i.test(e.message)) errs.push((tag + e.message).slice(0, 160));
    });
  };
  wire(page);
  const seedStorage = () => {
    try {
      localStorage.setItem('act_welcomed', '1');
      localStorage.setItem('act_consent', JSON.stringify({ necessary: true, analytics: false, personalization: false }));
    } catch {}
  };
  await page.evaluateOnNewDocument(seedStorage);
  await page.setViewport({ width: 1440, height: 900 });

  console.log('\nHOME · ATRIUM · EN');
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  const hydratedDates = await waitHomeHydrated(page);
  check('LiveWire hydrates SSR dates into relative stamps', Array.isArray(hydratedDates) && hydratedDates.length === 4, JSON.stringify(hydratedDates));
  await sleep(300);
  const home = await page.evaluate(() => ({
    atrium: !!document.querySelector('#atrium.atr'),
    legacyCards: document.querySelectorAll('.deck-card').length,
    stats: [...document.querySelectorAll('.atr-metric b')].map((b) => +b.textContent.replace(/,/g, '')),
    metricRoutes: [...document.querySelectorAll('.atr-metric')].map((a) => a.getAttribute('href') || ''),
    distribution: [...document.querySelectorAll('.atr-distribution ul li b')].map((b) => +b.textContent.replace(/,/g, '')),
    donutTotal: +(document.querySelector('.atr-donut > div > b')?.textContent || '0').replace(/,/g, ''),
    chartPoints: document.querySelectorAll('.atr-publishing .atr-point').length,
    chartMonths: [...document.querySelectorAll('.atr-publishing svg text')].map((t) => t.textContent.trim()),
    timelineTotal: +(document.querySelector('.atr-timeline-total b')?.textContent || '0').replace(/,/g, ''),
    srcled: !!document.querySelector('.atr-source .srcled'),
    ledgerRows: [...document.querySelectorAll('.atr-source .srcled .dk-net li')].map((li) => {
      const a = li.querySelector('a');
      return {
        href: a?.getAttribute('href') || '',
        target: a?.getAttribute('target') || '',
        rel: a?.getAttribute('rel') || '',
        dot: !!li.querySelector('.dk-dot'),
        name: li.querySelector('.dk-net-name')?.textContent.trim() || '',
        status: li.querySelector('.dk-status')?.textContent.trim() || '',
      };
    }),
    ledgerTime: document.querySelector('.atr-source .srcled-foot time')?.getAttribute('datetime') || '',
    ledgerNote: document.querySelector('.atr-source .srcled-note')?.textContent || '',
    statuses: [...document.querySelectorAll('.atr-source .dk-status')].map((s) => s.textContent.trim()),
    atriumText: document.querySelector('#atrium')?.textContent || '',
    wire: !!document.querySelector('.atr-signals .wire'),
    wireRows: [...document.querySelectorAll('.atr-signals .wire .dk-feed li')].map((li) => ({
      kind: li.querySelector('.dk-kind')?.textContent.trim() || '',
      title: li.querySelector('.dk-feed-title')?.textContent.trim() || '',
      date: li.querySelector('.dk-feed-date')?.textContent.trim() || '',
      href: li.querySelector('a')?.getAttribute('href') || '',
    })),
    wirePulse: !!document.querySelector('.atr-signals .wire .wire-pulse'),
    wireTime: document.querySelector('.atr-signals .wire time')?.getAttribute('datetime') || '',
    noticeCards: document.querySelectorAll('.atr-notices .nb-card').length,
    noticeViewAll: document.querySelector('.atr-notices .nb-viewall')?.getAttribute('href') || '',
    noticeLive: !!document.querySelector('.atr-notices .nb-live-tag'),
    noticeSources: [...document.querySelectorAll('.atr-notices .nb-card .nb-source')].map((a) => ({
      href: a.getAttribute('href') || '',
      target: a.getAttribute('target') || '',
      rel: a.getAttribute('rel') || '',
    })),
    quick: [...document.querySelectorAll('.atr-quick a')].map((a) => a.getAttribute('href') || ''),
    nav: [...document.querySelectorAll('.atr-side nav a')].map((a) => a.getAttribute('href') || ''),
    settings: document.querySelector('.atr-settings')?.getAttribute('href') || '',
    searchButton: !!document.querySelector('.atr-top-actions button:first-child'),
    nepalFacts: [...document.querySelectorAll('.npromo-fact-n')].map((b) => +b.textContent.trim()),
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  }));
  check('atrium dashboard replaces the fifteen-card deck', home.atrium && home.legacyCards === 0, `atrium=${home.atrium} legacy=${home.legacyCards}`);
  check('six real counters > 0', home.stats.length === 6 && home.stats.every((n) => n > 0), JSON.stringify(home.stats));
  check(
    'atrium metrics equal the real ledger counts',
    home.stats.length === METRIC_LEDGER.length && home.stats.every((n, i) => n === METRIC_LEDGER[i]),
    `got ${JSON.stringify(home.stats)} want ${JSON.stringify(METRIC_LEDGER)}`,
  );
  check(
    'atrium metrics link their canonical destinations',
    JSON.stringify(home.metricRoutes) === JSON.stringify(METRIC_ROUTES),
    JSON.stringify(home.metricRoutes),
  );
  check(
    'distribution chart equals the five content ledgers',
    JSON.stringify(home.distribution) === JSON.stringify(DISTRIBUTION_LEDGER) &&
      home.donutTotal === DISTRIBUTION_LEDGER.reduce((a, b) => a + b, 0),
    JSON.stringify(home.distribution),
  );
  check(
    'publishing chart has six points and six month labels',
    home.chartPoints === 6 && home.chartMonths.length === 6 && home.chartMonths.every((m) => /^[A-Za-z]{3}$/.test(m)),
    JSON.stringify(home.chartMonths),
  );
  check('publishing timeline has a real nonzero total', home.timelineTotal > 0, 'got ' + home.timelineTotal);
  check('old DIVISIONS ONLINE / LATEST DISPATCH headings gone', !/DIVISIONS ONLINE|LATEST DISPATCH/i.test(home.atriumText));
  const WIRE_KINDS = ['NEW', 'NOTICE', 'VERIFIED', 'NO RESPONSE', 'BOT CHECK', 'CLOSING', 'नयाँ', 'सूचना', 'प्रमाणित', 'प्रतिक्रिया छैन', 'बोट जाँच', 'बन्द हुँदै'];
  check('live wire card present', home.wire);
  check('four latest wire rows', home.wireRows.length === 4, 'got ' + home.wireRows.length);
  check(
    'wire rows carry kind/title/relative date',
    home.wireRows.length === 4 &&
      home.wireRows.every((r) => WIRE_KINDS.includes(r.kind) && r.title.length > 0 && r.date.length > 0 && !/^\d{4}-\d{2}-\d{2}$/.test(r.date)),
    JSON.stringify(home.wireRows.map((r) => r.kind)),
  );
  check(
    'wire rows link real routes',
    home.wireRows.length === 4 && home.wireRows.every((r) => /^(\/|https?:\/\/)/.test(r.href)),
    JSON.stringify(home.wireRows.map((r) => r.href)),
  );
  check('wire pulse dot present', home.wirePulse);
  check('wire carries a compiled <time datetime>', Number.isFinite(Date.parse(home.wireTime)), home.wireTime);
  check(
    'wire includes real notices and measured source states',
    home.wireRows.some((r) => /NOTICE|CLOSING|सूचना|बन्द हुँदै/.test(r.kind)) &&
      home.wireRows.some((r) => /VERIFIED|NO RESPONSE|BOT CHECK|प्रमाणित|प्रतिक्रिया छैन|बोट जाँच/.test(r.kind)),
    JSON.stringify(home.wireRows.map((r) => r.kind)),
  );
  check('atrium exposes all seven quick actions', JSON.stringify(home.quick) === JSON.stringify(['/explore?mode=earth', '/research', '/academy', '/games', '/darkroom', '/nepal', '/ai']), JSON.stringify(home.quick));
  check(
    'atrium navigation covers the ecosystem and relocated tools',
    home.nav.length === 10 &&
      ['#atrium', '/explore', '/research', '/academy', '/entertainment', '/games', '/darkroom', '/nepal', '/design-lab#instruments', '#signals'].every((href) => home.nav.includes(href)),
    JSON.stringify(home.nav),
  );
  check('atrium settings links to appearance anchor', home.settings === '/design-lab#appearance', home.settings);
  check('atrium exposes the global search trigger', home.searchButton);
  check(
    'Nepal promo counts match the guide ledger',
    JSON.stringify(home.nepalFacts) === JSON.stringify(NEPAL_FACTS) && home.nepalFacts.every((n) => n > 0),
    JSON.stringify(home.nepalFacts),
  );
  check('homepage desktop fits', !home.overflow);
  await page.evaluate(() => document.querySelector('#atrium')?.scrollIntoView({ block: 'start', behavior: 'instant' }));
  await sleep(400);
  await page.screenshot({ path: OUT + '/pro-dark.png' });

  console.log('\nHOME · WORLD PORTALS');
  await page.evaluate(() => document.querySelector('#portals')?.scrollIntoView({ block: 'start', behavior: 'instant' }));
  await sleep(300);
  const portals = await page.evaluate(() => ({
    cards: [...document.querySelectorAll('.world-portal')].map((a) => ({
      href: a.getAttribute('href') || '',
      name: a.querySelector('.world-portal-copy > b')?.textContent.trim() || '',
      subtitle: a.querySelector('.world-portal-copy > em')?.textContent.trim() || '',
      count: +(a.querySelector('.world-portal-count')?.textContent.match(/^[\d,]+/)?.[0].replace(/,/g, '') || '0'),
      num: a.querySelector('.world-portal-num')?.textContent.trim() || '',
      cta: a.querySelector('.world-portal-cta')?.textContent.trim() || '',
    })),
    back: document.querySelector('#portals .sechead a[href="#atrium"]')?.getAttribute('href') || '',
    more: [...document.querySelectorAll('.portal-more a')].map((a) => a.getAttribute('href') || ''),
  }));
  check('five world portal cards', portals.cards.length === 5, 'got ' + portals.cards.length);
  check(
    'world portals carry real names/routes/nonzero catalogue counts',
    portals.cards.length === DIVISIONS.length &&
      portals.cards.every((p, i) => p.href === DIVISIONS[i].route && p.name === DIVISIONS[i].name.en && p.subtitle.length > 0 && p.count === PORTAL_COUNTS[i] && p.count > 0),
    JSON.stringify(portals.cards),
  );
  check(
    'world portals are numbered and invite entry',
    portals.cards.length === 5 &&
      portals.cards.every((p, i) => p.num === String(i + 1).padStart(2, '0') && /enter world/i.test(p.cta)),
    JSON.stringify(portals.cards.map((p) => p.num)),
  );
  check('portals return to the atrium', portals.back === '#atrium', portals.back);
  check(
    'portal-more preserves secondary ecosystem navigation',
    JSON.stringify(portals.more) === JSON.stringify(['/nepal', '/explore', '/loksewa', '/blog', '/offers', '/ai']),
    JSON.stringify(portals.more),
  );
  await page.screenshot({ path: OUT + '/pro-portals.png' });

  console.log('\nHOME · FEATURED GAMES + FOUNDER');
  await page.evaluate(() => document.querySelector('.featured-games')?.scrollIntoView({ block: 'start', behavior: 'instant' }));
  const quick = await pollUntil(
    page,
    () => {
      const cards = [...document.querySelectorAll('.fg-card')];
      const imgs = cards.map((a) => a.querySelector('img')?.naturalWidth || 0);
      return cards.length === 6 && imgs.every((n) => n > 0)
        ? cards.map((a, i) => ({ href: a.getAttribute('href') || '', img: imgs[i] }))
        : null;
    },
    undefined,
    30000,
  );
  const featured = await page.evaluate(() => ({
    counts: [...document.querySelectorAll('.fg-counts b')].map((b) => +b.textContent.replace(/,/g, '')),
    allGames: [...document.querySelectorAll('.featured-games a[href="/games"]')].length,
  }));
  check('six featured game cards', Array.isArray(quick) && quick.length === 6, 'got ' + (quick?.length || 0));
  check(
    'featured games are the six direct arcade launches',
    Array.isArray(quick) && JSON.stringify(quick.map((q) => q.href)) === JSON.stringify(QUICK_URLS) && quick.every((q) => q.href.startsWith('/arcade/index.html?game=')),
    JSON.stringify(quick?.map((q) => q.href)),
  );
  check('featured game thumbnails load', Array.isArray(quick) && quick.every((q) => q.img > 0), JSON.stringify(quick?.map((q) => q.img)));
  check(
    'featured game catalogue/arcade/public counts are real and nonzero',
    featured.counts.length === 3 && featured.counts.every((n) => n > 0) && featured.counts[0] === COUNTS.games,
    JSON.stringify(featured.counts),
  );
  check('featured section links to the games catalogue', featured.allGames > 0);
  await page.evaluate(() => document.querySelector('.founder')?.scrollIntoView({ block: 'start', behavior: 'instant' }));
  const founder = await pollUntil(
    page,
    () => {
      const root = document.querySelector('.founder');
      if (!root) return null;
      const imgs = [...root.querySelectorAll('img')].map((img) => ({ src: img.getAttribute('src') || '', width: img.naturalWidth }));
      return imgs.length === 2 && imgs.every((img) => img.width > 0)
        ? {
            title: root.querySelector('#founder-title')?.textContent.trim() || '',
            story: root.querySelector('.founder-copy .lead')?.textContent.trim() || '',
            quote: root.querySelector('.founder-copy blockquote')?.textContent.trim() || '',
            ring: !!root.querySelector('.founder-ring'),
            routes: [...root.querySelectorAll('.founder-actions a')].map((a) => a.getAttribute('href') || ''),
            imgs,
          }
        : null;
    },
    undefined,
    30000,
  );
  check(
    'founder guide renders the story, ring, quote and both portraits',
    !!founder && founder.ring && /one person with one idea/i.test(founder.story) && founder.quote.length > 0 &&
      founder.imgs.some((img) => img.src === '/media/founder-pro.jpg') && founder.imgs.some((img) => img.src === '/media/founder-casual.jpg'),
    JSON.stringify(founder),
  );
  check(
    'founder guide links the 360 tour and contact',
    !!founder && JSON.stringify(founder.routes) === JSON.stringify(['/explore?mode=360&world=university', '/contact']),
    JSON.stringify(founder?.routes),
  );
  await page.screenshot({ path: OUT + '/pro-founder.png' });

  console.log('\nGLOBAL SEARCH');
  await page.keyboard.down('Control');
  await page.keyboard.press('k');
  await page.keyboard.up('Control');
  const search0 = await pollUntil(
    page,
    () => {
      const commands = [...document.querySelectorAll('.mbd .rowlink')].filter((el) => el.tagName === 'BUTTON');
      return document.querySelector('.mbd input') && commands.length === 12 ? commands.map((b) => b.textContent.trim()) : null;
    },
    undefined,
    12000,
  );
  check('Ctrl+K opens global search with twelve world commands', Array.isArray(search0) && search0.length === 12, JSON.stringify(search0));
  await setVal(page, '.mbd input', 'ai');
  const search1 = await pollUntil(
    page,
    () => {
      const commands = [...document.querySelectorAll('.mbd .rowlink')].filter((el) => el.tagName === 'BUTTON');
      const results = [...document.querySelectorAll('.mbd a.rowlink')];
      return document.querySelector('.mbd input')?.value === 'ai' && commands.length === 1 && results.length > 0
        ? { commands: commands.map((b) => b.textContent.trim()), results: results.map((a) => a.textContent.trim()) }
        : null;
    },
    undefined,
    25000,
  );
  check(
    'global search filters commands and returns published content',
    !!search1 && search1.commands.length === 1 && /open ai/i.test(search1.commands[0]) && search1.results.length > 0,
    JSON.stringify(search1),
  );
  await page.keyboard.press('Escape');
  const searchClosed = await pollUntil(page, () => (!document.querySelector('.mbd') ? true : null), undefined, 8000);
  check('Escape closes global search', !!searchClosed);
  await page.evaluate(() => document.querySelector('.atr-top-actions button:first-child')?.click());
  await pollUntil(page, () => (document.querySelector('.mbd input') ? true : null), undefined, 10000);
  await setVal(page, '.mbd input', 'ai');
  await pollUntil(
    page,
    () => {
      const command = [...document.querySelectorAll('.mbd button.rowlink')].find((b) => /^Open AI/.test(b.textContent.trim()));
      return document.querySelector('.mbd input')?.value === 'ai' && command ? true : null;
    },
    undefined,
    12000,
  );
  await page.evaluate(() => [...document.querySelectorAll('.mbd button.rowlink')].find((b) => /^Open AI/.test(b.textContent.trim()))?.click());
  const searchNav = await pollUntil(page, () => (location.pathname === '/ai' ? location.pathname : null), undefined, 20000);
  check('search world command navigates to its destination', searchNav === '/ai', String(searchNav));

  console.log('\nTOOL BENCH · /design-lab#instruments');
  await page.goto(BASE + '/design-lab#instruments', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitLabHydrated(page);
  check('tool bench is mounted at #instruments', await page.evaluate(() => location.hash === '#instruments' && !!document.querySelector('#instruments .tb')));
  const tabs = await page.evaluate(() => document.querySelectorAll('#instruments .tb-tab').length);
  check('five tool tabs', tabs === 5, 'got ' + tabs);

  console.log('\nTOOL BENCH · CONVERT');
  await clickText(page, '#instruments .tb-convert .tb-seg-btn', 'Temperature');
  await setVal(page, '#tb-conv-val', '100');
  const conv = await pollUntil(
    page,
    () => {
      const value = {
        res: document.querySelector('#instruments .tb-result-num')?.textContent || '',
        from: document.querySelector('#tb-conv-from')?.value,
        to: document.querySelector('#tb-conv-to')?.value,
      };
      return /212/.test(value.res) && value.from === '°C' && value.to === '°F' ? value : null;
    },
    undefined,
    10000,
  );
  check('temperature 100°C → 212°F', !!conv, JSON.stringify(conv));

  console.log('\nTOOL BENCH · CALCULATOR');
  await clickTab(page, 1);
  for (const k of ['7', '×', '8', '=']) await clickText(page, '#instruments .tb-calc-keys .tb-key', k);
  const calcDisp = await pollUntil(page, () => (document.querySelector('#instruments .tb-calc-disp')?.textContent === '56' ? '56' : null), undefined, 10000);
  check('calculator 7 × 8 = 56', calcDisp === '56', 'got ' + calcDisp);
  await page.evaluate(() => document.querySelector('#instruments')?.scrollIntoView({ block: 'start', behavior: 'instant' }));
  await page.screenshot({ path: OUT + '/pro-calc.png' });

  console.log('\nTOOL BENCH · FOCUS');
  await clickTab(page, 2);
  const f0 = await page.evaluate(() => document.querySelector('#instruments .tb-focus-time b')?.textContent);
  await page.evaluate(() => document.querySelector('#instruments .tb-focus-ctrl .btn-p')?.click());
  const f1 = await pollUntil(
    page,
    (prev) => {
      const value = document.querySelector('#instruments .tb-focus-time b')?.textContent || '';
      return value && value !== prev ? value : null;
    },
    f0,
    12000,
  );
  check('focus timer counts down', f0 === '25:00' && !!f1 && f1 !== '25:00', `${f0} -> ${f1}`);
  await clickTab(page, 0);
  const dot = await pollUntil(page, () => (document.querySelector('#instruments .tb-tab-dot') ? true : null), undefined, 8000);
  check('running focus shows tab dot', !!dot);
  await clickTab(page, 2);
  await page.evaluate(() => document.querySelector('#instruments .tb-focus-ctrl .btn-g')?.click());
  const f2 = await pollUntil(page, () => (document.querySelector('#instruments .tb-focus-time b')?.textContent === '25:00' ? '25:00' : null), undefined, 8000);
  check('focus reset restores 25:00', f2 === '25:00', 'got ' + f2);

  console.log('\nTOOL BENCH · NOTES');
  await clickTab(page, 3);
  await setVal(page, '#instruments .tb-textarea', '');
  await page.type('#instruments .tb-textarea', 'QA note 123');
  const notes = await pollUntil(
    page,
    () => {
      const value = {
        saved: localStorage.getItem('act_notes'),
        foot: document.querySelector('#instruments .tb-notes-foot .dk-foot')?.textContent || '',
      };
      return value.saved === 'QA note 123' ? value : null;
    },
    undefined,
    10000,
  );
  check('notes autosave to device', notes?.saved === 'QA note 123', String(notes?.saved));
  check('notes char count', /·\s*11\s+characters/.test(notes?.foot || ''), notes?.foot);

  console.log('\nTOOL BENCH · PASSWORD');
  await clickTab(page, 4);
  const pw0 = await pollUntil(page, () => (document.querySelector('#instruments .tb-key-out .tb-input')?.value.length === 16 ? true : null), undefined, 10000);
  check('password generated (len 16)', !!pw0);
  await setVal(page, '#tb-key-len', '24');
  const pw1 = await pollUntil(page, () => (document.querySelector('#instruments .tb-key-out .tb-input')?.value.length === 24 ? true : null), undefined, 10000);
  check('length slider → 24 chars', !!pw1);
  const beforeGenerate = await page.evaluate(() => document.querySelector('#instruments .tb-key-out .tb-input')?.value || '');
  await page.evaluate(() => document.querySelector('#instruments .tb-cta')?.click());
  const pw2 = await pollUntil(
    page,
    (prev) => {
      const value = document.querySelector('#instruments .tb-key-out .tb-input')?.value || '';
      return value.length === 24 && value !== prev ? value : null;
    },
    beforeGenerate,
    10000,
  );
  const meter = await page.evaluate(() => document.querySelector('#instruments .tb-meter-track span')?.style.width || '');
  check('generate makes a new password', !!pw2, String(pw2));
  check('strength meter filled', parseFloat(meter) > 0, meter);

  console.log('\nAPPEARANCE STUDIO · /design-lab#appearance');
  await page.goto(BASE + '/design-lab#appearance', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitLabHydrated(page);
  check('appearance studio is mounted at #appearance', await page.evaluate(() => location.hash === '#appearance' && !!document.querySelector('#appearance .ap')));
  const swatches = await page.evaluate(() => document.querySelectorAll('#appearance .ap-swatch').length);
  check('nineteen theme swatches', swatches === 19, 'got ' + swatches);
  for (const [label, id, file] of [
    ['Crimson Signal', 'crimson', 'pro-crimson'],
    ['Matcha Light', 'matcha', 'pro-matcha'],
    ['Glacier Light', 'glacier', 'pro-glacier'],
    ['Frosted Glass · Premium', 'glass', 'pro-glass'],
    ['Crystal Glass · Light', 'crystal', 'pro-crystal'],
    ['Transparent Veil', 'veil', 'pro-veil'],
  ]) {
    const applied = await clickTheme(page, label, id);
    check(`${label} applies and saves`, applied === id, 'got ' + applied);
    await page.evaluate(() => document.querySelector('#appearance')?.scrollIntoView({ block: 'start', behavior: 'instant' }));
    await sleep(250);
    await page.screenshot({ path: OUT + '/' + file + '.png' });
  }
  // Density/motion no longer scope CSS to a homepage .deck. Their live contract
  // is the pressed control state plus the persisted preference consumed by the
  // system; glass/glow likewise expose their real values in the controls.
  await clickText(page, '#appearance .ap-grid .tb-seg-btn', 'Compact');
  const dense = await pollUntil(
    page,
    () => {
      const button = [...document.querySelectorAll('#appearance .ap-grid .tb-seg-btn')].find((b) => b.textContent.trim() === 'Compact');
      return button?.getAttribute('aria-pressed') === 'true' && localStorage.getItem('act_density') === 'compact' ? 'compact' : null;
    },
    undefined,
    10000,
  );
  check('compact density applies and persists', dense === 'compact', String(dense));
  await clickText(page, '#appearance .ap-grid .tb-seg-btn', 'Reduced');
  const motion = await pollUntil(
    page,
    () => {
      const button = [...document.querySelectorAll('#appearance .ap-grid .tb-seg-btn')].find((b) => b.textContent.trim() === 'Reduced');
      return button?.getAttribute('aria-pressed') === 'true' && localStorage.getItem('act_motion') === 'reduced' ? 'reduced' : null;
    },
    undefined,
    10000,
  );
  check('reduced motion applies and persists', motion === 'reduced', String(motion));
  await setVal(page, '#ap-glass', '20');
  await setVal(page, '#ap-glow', '30');
  const surface = await pollUntil(
    page,
    () => {
      const value = {
        glass: document.querySelector('#ap-glass')?.value,
        glow: document.querySelector('#ap-glow')?.value,
        savedGlass: localStorage.getItem('act_glass'),
        savedGlow: localStorage.getItem('act_glow'),
      };
      return value.glass === '20' && value.glow === '30' && value.savedGlass === '20' && value.savedGlow === '30' ? value : null;
    },
    undefined,
    10000,
  );
  check('glass blur control persists its real value', surface?.savedGlass === '20', JSON.stringify(surface));
  check('accent glow control persists its real value', surface?.savedGlow === '30', JSON.stringify(surface));
  const beforeShuffle = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  await page.evaluate(() => document.querySelector('#appearance .ap-actions .btn')?.click());
  const afterShuffle = await pollUntil(
    page,
    (prev) => {
      const theme = document.documentElement.getAttribute('data-theme');
      return theme && theme !== prev && localStorage.getItem('act_theme') === theme ? theme : null;
    },
    beforeShuffle,
    10000,
  );
  check('shuffle changes theme', !!afterShuffle && afterShuffle !== beforeShuffle, `${beforeShuffle} -> ${afterShuffle}`);
  await page.evaluate(() => document.querySelectorAll('#appearance .ap-actions .btn')[1]?.click());
  const reset = await pollUntil(
    page,
    () => {
      const pressed = (label) => [...document.querySelectorAll('#appearance .ap-grid .tb-seg-btn')].find((b) => b.textContent.trim() === label)?.getAttribute('aria-pressed');
      const value = {
        density: localStorage.getItem('act_density'),
        motion: localStorage.getItem('act_motion'),
        glass: document.querySelector('#ap-glass')?.value,
        glow: document.querySelector('#ap-glow')?.value,
        comfortable: pressed('Comfortable'),
        full: pressed('Full'),
      };
      return value.density === 'comfortable' && value.motion === 'full' && value.glass === '70' && value.glow === '60' && value.comfortable === 'true' && value.full === 'true'
        ? value
        : null;
    },
    undefined,
    10000,
  );
  check('reset restores appearance defaults', !!reset, JSON.stringify(reset));
  await clickTheme(page, 'Obsidian (default)', 'dark');

  console.log('\nTHEME PERSISTENCE · DESIGN LAB');
  await clickTheme(page, 'Deep Ocean', 'ocean');
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitLabHydrated(page);
  check('theme persists across reload', await page.evaluate(() => document.documentElement.getAttribute('data-theme') === 'ocean' && localStorage.getItem('act_theme') === 'ocean'));
  await clickTheme(page, 'Matcha Light', 'matcha');
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
  const matchaDCL = await page.evaluate(() => ({
    theme: document.documentElement.getAttribute('data-theme'),
    tc: document.querySelector('meta[name=theme-color]')?.getAttribute('content'),
  }));
  check('new light theme paints pre-hydration', matchaDCL.theme === 'matcha' && matchaDCL.tc === '#f4f7fc', JSON.stringify(matchaDCL));
  await waitLabHydrated(page);
  check('new light theme persists across reload', await page.evaluate(() => document.documentElement.getAttribute('data-theme') === 'matcha'));
  await clickTheme(page, 'Crystal Glass · Light', 'crystal');
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
  const crystalDCL = await page.evaluate(() => ({
    theme: document.documentElement.getAttribute('data-theme'),
    tc: document.querySelector('meta[name=theme-color]')?.getAttribute('content'),
  }));
  check('crystal light theme paints pre-hydration', crystalDCL.theme === 'crystal' && crystalDCL.tc === '#f4f7fc', JSON.stringify(crystalDCL));
  await waitLabHydrated(page);
  check('crystal light theme persists across reload', await page.evaluate(() => document.documentElement.getAttribute('data-theme') === 'crystal'));
  await clickTheme(page, 'Obsidian (default)', 'dark');

  console.log('\nPOINTER STUDIO · /design-lab#pointer');
  await page.goto(BASE + '/design-lab#pointer', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitLabHydrated(page);
  check('pointer studio is mounted at #pointer', await page.evaluate(() => location.hash === '#pointer' && !!document.querySelector('#pointer .ptr')));
  await page.evaluate(() => document.querySelector('#pointer')?.scrollIntoView({ block: 'start', behavior: 'instant' }));
  const ptr = await page.evaluate(() => {
    const root = document.querySelector('#pointer .ptr');
    if (!root) return { present: false };
    const visible = (el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    };
    const overlay = document.querySelector('.mag-pointer, [class*="mag-pointer"]');
    const range = root.querySelector('input[type=range]');
    return {
      present: true,
      inCard: !!document.querySelector('#pointer') && document.querySelector('#pointer').contains(root),
      ranges: root.querySelectorAll('input[type=range]').length,
      selects: root.querySelectorAll('select').length,
      switches: [...root.querySelectorAll('[role="switch"]')].filter(visible).length,
      btns: [...root.querySelectorAll('button')].map((b) => b.textContent.trim()),
      overlay: !!overlay,
      range: range ? { value: range.value, min: range.min, max: range.max } : null,
      before: { ls: localStorage.getItem('act_pointer'), pull: root.querySelector('.ptr-pv-target.a')?.style.getPropertyValue('--pull') },
    };
  });
  check('pointer studio lives under #pointer', ptr.present && ptr.inCard, JSON.stringify({ present: ptr.present, inCard: ptr.inCard }));
  check('pointer studio has nine sliders', ptr.ranges === 9, 'got ' + ptr.ranges);
  check('pointer studio has preset and blend selects', ptr.selects === 2, 'got ' + ptr.selects);
  check(
    'pointer studio offers Reset / Randomize / Export',
    (ptr.btns || []).some((b) => /reset/i.test(b)) && (ptr.btns || []).some((b) => /random/i.test(b)) && (ptr.btns || []).some((b) => /export/i.test(b)),
    JSON.stringify(ptr.btns || []),
  );
  check('pointer studio has three visible switches', ptr.switches === 3, 'got ' + ptr.switches);
  let ptrMoved = false;
  let ptrDetail = 'no .ptr controls';
  if (ptr.present && ptr.range) {
    const target = String(ptr.range.value) === String(ptr.range.max) ? ptr.range.min : ptr.range.max;
    await setVal(page, '#ptr-strength', target);
    const after = await pollUntil(
      page,
      (prev) => {
        const ls = localStorage.getItem('act_pointer');
        const pull = document.querySelector('#pointer .ptr-pv-target.a')?.style.getPropertyValue('--pull');
        return ls && ls !== prev.ls && pull !== prev.pull ? { ls, pull } : null;
      },
      ptr.before,
      12000,
    );
    ptrMoved = !!after;
    ptrDetail = `overlay=${ptr.overlay} · act_pointer ${ptr.before.ls === after?.ls ? 'same' : 'rewritten'} · pull ${ptr.before.pull} -> ${after?.pull}`;
    await page.evaluate(() => [...document.querySelectorAll('#pointer .ptr button')].find((b) => /reset/i.test(b.textContent))?.click());
    const ptrReset = await pollUntil(
      page,
      () => {
        const value = document.querySelector('#ptr-strength')?.value;
        const saved = JSON.parse(localStorage.getItem('act_pointer') || '{}');
        return value === '85' && saved.strength === 85 ? true : null;
      },
      undefined,
      10000,
    );
    check('pointer reset restores defaults', !!ptrReset);
  }
  check('moving a slider drives the live preview and saved pointer prefs', ptrMoved, ptrDetail);

  console.log('\nDEVICE PULSE · /design-lab#diagnostics');
  await page.goto(BASE + '/design-lab#diagnostics', { waitUntil: 'domcontentloaded', timeout: 60000 });
  const pulseReady = await waitLabHydrated(page);
  check('device pulse is mounted at #diagnostics', await page.evaluate(() => location.hash === '#diagnostics' && !!document.querySelector('#diagnostics .pulse')));
  await page.evaluate(() => document.querySelector('#diagnostics')?.scrollIntoView({ block: 'start', behavior: 'instant' }));
  const p0 = await page.evaluate(() => ({
    rows: document.querySelectorAll('#diagnostics .pulse-list li').length,
    vals: [...document.querySelectorAll('#diagnostics .pulse-v')].map((v) => v.textContent.trim()),
    note: document.querySelector('#diagnostics .pulse-note')?.textContent || '',
    vw: window.innerWidth,
  }));
  check('seven pulse rows', p0.rows === 7, 'got ' + p0.rows);
  check('pulse viewport matches window', p0.vals.some((v) => v.startsWith(p0.vw + '×')), JSON.stringify(p0.vals));
  check('pulse honesty note present', /not server traffic/i.test(p0.note), p0.note);
  const up1 = await pollUntil(
    page,
    (prev) => {
      const value = document.querySelectorAll('#diagnostics .pulse-v')[1]?.textContent.trim() || '';
      return value && value !== prev ? value : null;
    },
    p0.vals[1],
    15000,
  );
  check('pulse uptime ticks', !!up1 && up1 !== p0.vals[1], `${p0.vals[1]} -> ${up1}`);
  check('Design Lab hydration populated all device signals', Array.isArray(pulseReady) && pulseReady.length === 7, JSON.stringify(pulseReady));

  console.log('\nLOKSEWA COUNTS · DESTINATION');
  await page.goto(BASE + '/loksewa', { waitUntil: 'domcontentloaded', timeout: 60000 });
  const lkHub = await pollUntil(
    page,
    (want) => {
      const stats = [...document.querySelectorAll('.lk-hero-stats b')].map((b) => +b.textContent.trim());
      const paperLinks = [...document.querySelectorAll('.lk-paper')].map((a) => a.getAttribute('href') || '');
      const questionText = document.querySelector('.lktest-score span')?.textContent || '';
      if (stats.length !== 4 || paperLinks.length !== want.papers || !questionText) return null;
      return {
        stats,
        papers: paperLinks.length,
        paperLinks,
        laws: document.querySelectorAll('.lk-laws li').length,
        questions: +(questionText.match(/[\d,]+/)?.[0].replace(/,/g, '') || '0'),
      };
    },
    LOKSEWA_COUNTS,
    30000,
  );
  check(
    'Loksewa hub papers/subjects/folders/laws match the content ledger',
    !!lkHub && JSON.stringify(lkHub.stats) === JSON.stringify([LOKSEWA_COUNTS.papers, LOKSEWA_COUNTS.subjects, LOKSEWA_COUNTS.folders, LOKSEWA_COUNTS.laws]) && lkHub.laws === LOKSEWA_COUNTS.laws,
    JSON.stringify(lkHub),
  );
  check(
    'Loksewa paper cards link every paper',
    !!lkHub && JSON.stringify(lkHub.paperLinks) === JSON.stringify(loksewa.papers.map((p) => '/loksewa/' + p.slug)),
    JSON.stringify(lkHub?.paperLinks),
  );
  check('Loksewa practice bank exposes the real question count', lkHub?.questions === LOKSEWA_COUNTS.questions, `got ${lkHub?.questions} want ${LOKSEWA_COUNTS.questions}`);
  let renderedPoints = 0;
  for (const paper of loksewa.papers) {
    await page.goto(BASE + '/loksewa/' + paper.slug, { waitUntil: 'domcontentloaded', timeout: 60000 });
    const rows = await pollUntil(
      page,
      (want) => {
        const values = [...document.querySelectorAll('.lk-subject-units')].map((el) => el.textContent.replace(/\s+/g, ' ').trim());
        return values.length === want ? values : null;
      },
      paper.subjects.length,
      30000,
    );
    const actual = (rows || []).map((text) => {
      const match = text.match(/(\d+)\s+फोल्डर\s+·\s+(\d+)\s+बुँदा/);
      return match ? [+match[1], +match[2]] : null;
    });
    const expected = paper.subjects.map((s) => [s.units.length, s.units.reduce((n, u) => n + u.points.length, 0)]);
    renderedPoints += actual.reduce((n, row) => n + (row?.[1] || 0), 0);
    check(`Loksewa ${paper.slug} folder/point counts match the ledger`, JSON.stringify(actual) === JSON.stringify(expected), `got ${JSON.stringify(actual)} want ${JSON.stringify(expected)}`);
  }
  check('Loksewa aggregate points match the content ledger', renderedPoints === LOKSEWA_COUNTS.points, `got ${renderedPoints} want ${LOKSEWA_COUNTS.points}`);

  console.log('\nOFFERS · DESTINATION');
  await page.goto(BASE + '/offers', { waitUntil: 'domcontentloaded', timeout: 60000 });
  const offerCards = await pollUntil(
    page,
    (want) => {
      const cards = [...document.querySelectorAll('a.card[href^="/offers/"]')];
      return cards.length === want ? cards.map((a) => a.getAttribute('href') || '') : null;
    },
    OFFERS.length,
    30000,
  );
  check('offers grid renders every published offer', Array.isArray(offerCards) && offerCards.length === OFFERS.length, `got ${offerCards?.length || 0} want ${OFFERS.length}`);
  check(
    'offer cards link their real offer routes',
    Array.isArray(offerCards) && JSON.stringify(offerCards) === JSON.stringify(OFFERS.map((o) => '/offers/' + o.slug)),
    JSON.stringify(offerCards),
  );
  const priceText = (offer, currency) => {
    const npr = Number(offer.npr || 0);
    const usd = Number(offer.usd || 0);
    const rate = Number(seed.settings.usdToNpr);
    if (currency === 'NPR') {
      const value = npr || usd * rate;
      return value ? `रु ${Math.round(value).toLocaleString('en-US')} NPR` : 'Custom scope';
    }
    const value = usd || (npr ? npr / rate : 0);
    return value ? `$${(Math.round(value * 100) / 100).toLocaleString('en-US')} USD` : 'Custom scope';
  };
  await chooseCurrency(page, 'NPR');
  const nprPrice = await page.evaluate(() => document.querySelector('a.card[href^="/offers/"] .font-display.mb-5')?.textContent.trim() || '');
  check('offer price uses the real NPR ledger value', nprPrice === priceText(OFFERS[0], 'NPR'), `got ${nprPrice} want ${priceText(OFFERS[0], 'NPR')}`);
  await chooseCurrency(page, 'USD');
  const usdPrice = await page.evaluate(() => document.querySelector('a.card[href^="/offers/"] .font-display.mb-5')?.textContent.trim() || '');
  check('offer currency switch uses the real USD ledger value', usdPrice === priceText(OFFERS[0], 'USD'), `got ${usdPrice} want ${priceText(OFFERS[0], 'USD')}`);
  check('offer currency preference persists', await page.evaluate(() => localStorage.getItem('act_cur') === 'USD'));
  await chooseCurrency(page, 'NPR');

  console.log('\nNEPAL COUNTS · DESTINATION');
  await page.goto(BASE + '/nepal', { waitUntil: 'domcontentloaded', timeout: 60000 });
  const np = await pollUntil(
    page,
    (want) => {
      const cards = document.querySelectorAll('.np-card').length;
      const meta = document.querySelector('.np-head-meta')?.textContent.replace(/\s+/g, ' ').trim() || '';
      return cards === want.places && meta ? { cards, meta, unesco: document.querySelectorAll('.np-card .np-unesco').length } : null;
    },
    NEPAL_TOTALS,
    40000,
  );
  check(
    'Nepal destination places/regions match the guide ledger',
    !!np && np.meta === `${NEPAL_TOTALS.regions} REGIONS · ${NEPAL_TOTALS.places} PLACES` && np.cards === NEPAL_TOTALS.places,
    JSON.stringify(np),
  );
  check('Nepal destination UNESCO badges match the guide ledger', np?.unesco === NEPAL_FACTS[0], `got ${np?.unesco} want ${NEPAL_FACTS[0]}`);

  console.log('\nHOME · NE');
  await page.goto(BASE + '/ne', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitHomeHydrated(page);
  const ne = await page.evaluate(() => ({
    lang: document.documentElement.lang,
    kicker: document.querySelector('.atr-welcome .atr-kicker')?.textContent || '',
    atrium: !!document.querySelector('#atrium.atr'),
    metrics: [...document.querySelectorAll('.atr-metric b')].map((b) => +b.textContent.replace(/,/g, '')),
    portals: document.querySelectorAll('.world-portal').length,
    portalTitle: document.querySelector('#portals h2')?.textContent || '',
    games: document.querySelectorAll('.fg-card').length,
    srcled: !!document.querySelector('.atr-source .srcled'),
    wire: !!document.querySelector('.atr-signals .wire'),
    statuses: [...document.querySelectorAll('.atr-source .dk-status')].map((s) => s.textContent.trim()),
    wireKinds: [...document.querySelectorAll('.atr-signals .dk-kind')].map((s) => s.textContent.trim()),
    founder: document.querySelector('#founder-title')?.textContent || '',
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  }));
  check('Nepali homepage renders the atrium and localized welcome', ne.lang === 'ne' && ne.atrium && /संसारमा स्वागत/.test(ne.kicker), JSON.stringify(ne));
  check('Nepali atrium keeps the six real metrics', JSON.stringify(ne.metrics) === JSON.stringify(METRIC_LEDGER), JSON.stringify(ne.metrics));
  check('Nepali portals and featured games preserve the new architecture', ne.portals === 5 && ne.games === 6 && /पाँच विभाग/.test(ne.portalTitle), JSON.stringify(ne));
  check('Nepali homepage carries the real live wire', ne.wire, JSON.stringify({ wire: ne.wire }));
  check(
    'Nepali wire labels are localized and honest',
    ne.wireKinds.length === 4 && ne.wireKinds.every((k) => WIRE_KINDS.includes(k)),
    JSON.stringify({ wireKinds: ne.wireKinds }),
  );
  check('Nepali founder guide renders', /संस्थापक/.test(ne.founder), ne.founder);
  check('Nepali homepage desktop fits', !ne.overflow);

  console.log('\nMOBILE · RESPONSIVE HOME + RELOCATED TOOLS');
  const m = await browser.newPage();
  wire(m, 'mobile ');
  await m.evaluateOnNewDocument(seedStorage);
  await m.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await m.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitHomeHydrated(m);
  const m390 = await responsiveLayout(m);
  check(
    'homepage reflows cleanly at 390 (no page/shell overflow)',
    m390.docFits && m390.shellFits && m390.portals === 5 && m390.games === 6,
    JSON.stringify(m390),
  );
  check(
    'atrium 390 uses a scrolling nav and horizontal portal/game rails',
    m390.navOverflow === 'auto' && m390.portalRail && m390.gameRail,
    JSON.stringify(m390),
  );
  await m.evaluate(() => document.querySelector('#atrium')?.scrollIntoView({ block: 'start', behavior: 'instant' }));
  await sleep(400);
  await m.screenshot({ path: OUT + '/pro-mobile.png', fullPage: false });
  await m.goto(BASE + '/design-lab#instruments', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitLabHydrated(m);
  await clickTab(m, 1);
  for (const k of ['9', '−', '4', '=']) await clickText(m, '#instruments .tb-calc-keys .tb-key', k);
  const mobileCalc = await pollUntil(m, () => (document.querySelector('#instruments .tb-calc-disp')?.textContent === '5' ? '5' : null), undefined, 10000);
  check('mobile calculator 9 − 4 = 5 at #instruments', mobileCalc === '5', 'got ' + mobileCalc);
  await m.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitHomeHydrated(m);
  await m.setViewport({ width: 320, height: 700, isMobile: true, hasTouch: true });
  await m.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitHomeHydrated(m);
  const m320 = await responsiveLayout(m);
  check('homepage fits 320', m320.docFits && m320.shellFits && m320.portalRail && m320.gameRail, JSON.stringify(m320));
  await m.setViewport({ width: 768, height: 1024, isMobile: true, hasTouch: true });
  await sleep(500);
  const m768 = await responsiveLayout(m);
  check(
    'homepage fits 768 with stacked atrium and two-column content',
    m768.docFits && m768.shellFits && m768.atriumDisplay === 'block' && m768.portalColumns === 2 && m768.gameColumns === 2,
    JSON.stringify(m768),
  );
  await m.evaluate(() => document.querySelector('#portals')?.scrollIntoView({ block: 'start', behavior: 'instant' }));
  await sleep(400);
  await m.screenshot({ path: OUT + '/pro-tablet.png', fullPage: false });
  await m.setViewport({ width: 1280, height: 800, isMobile: false, hasTouch: false });
  await sleep(500);
  const m1280 = await responsiveLayout(m);
  check(
    'homepage fits 1280 with desktop atrium/portal/game grids',
    m1280.docFits && m1280.shellFits && m1280.atriumDisplay === 'grid' && m1280.portalColumns === 6 && m1280.gameColumns === 3,
    JSON.stringify(m1280),
  );
  await m.close();

  console.log('\nREDUCED MOTION (OS)');
  const r = await browser.newPage();
  wire(r, 'rm ');
  await r.evaluateOnNewDocument(seedStorage);
  await r.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await r.setViewport({ width: 1440, height: 900 });
  await r.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitHomeHydrated(r);
  const rm = await r.evaluate(() => ({
    anim: getComputedStyle(document.querySelector('.npromo-img')).animationName,
    visible: getComputedStyle(document.querySelector('.atr-shell')).opacity,
  }));
  check('OS reduced motion stops the Nepal promo drift', rm.anim === 'none' && rm.visible === '1', JSON.stringify(rm));
  await r.goto(BASE + '/design-lab#diagnostics', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitLabHydrated(r);
  const rmPulse = await r.evaluate(() => document.querySelectorAll('#diagnostics .pulse-v')[4]?.textContent.trim() || '');
  check('device pulse reports OS reduced motion', rmPulse === 'Reduced', rmPulse);
  await r.close();

  check('no console/page errors', errs.length === 0, errs.slice(0, 5).join(' | '));
  console.log('\nRESULT ' + pass + ' passed, ' + fails.length + ' failed');
  if (fails.length) console.log('FAILURES\n- ' + fails.join('\n- '));
  await browser.close();
  process.exit(fails.length ? 1 : 0);
})().catch((e) => {
  console.error('FATAL', e);
  process.exit(1);
});
