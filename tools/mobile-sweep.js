/**
 * Mobile overflow sweep — every route at 390 and 320 px.
 * Usage: node tools/mobile-sweep.js [base-url]
 * The homepage dashboard sidebar is a horizontal scroll region at <=700px,
 * so its off-viewport links are reachable content, not page overflow.
 */
const puppeteer = require('puppeteer');
const BASE = process.argv[2] || 'https://acttolog.github.io';
const ROUTES = [
  '/',
  '/nepal',
  '/explore',
  '/search?q=pokhara',
  '/offers',
  '/about',
  '/contact',
  '/my',
  '/my/saved',
  '/my/settings',
  '/games',
  '/academy',
];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const b = await puppeteer.launch({
    headless: 'shell',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader'],
  });
  let bad = 0;
  for (const width of [390, 320]) {
    for (const route of ROUTES) {
      const p = await b.newPage();
      await p.setViewport({ width, height: 844 });
      await p.evaluateOnNewDocument(() => {
        try {
          localStorage.setItem(
            'act_consent',
            JSON.stringify({ necessary: true, analytics: false, personalization: false }),
          );
          localStorage.setItem('act_welcomed', '1');
        } catch {}
      });
      try {
        await p.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 90000 });
        await sleep(route === '/' || route.startsWith('/explore') ? 6500 : 4000);
        const r = await p.evaluate(() => {
          const de = document.documentElement;
          const over = de.scrollWidth - de.clientWidth;
          const vw = de.clientWidth;
          const vh = window.innerHeight;
          // Inside a horizontally scrollable rail (the deck at <=700px) cards
          // legitimately sit beyond the viewport — they are reachable by
          // scrolling the rail, so they are not page-overflow offenders.
          const inHRail = (el) => {
            for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
              const cs = getComputedStyle(a);
              if ((cs.overflowX === 'auto' || cs.overflowX === 'scroll') && a.scrollWidth > a.clientWidth + 1) return true;
            }
            return false;
          };
          // position:fixed skip-links parked offscreen are intentional.
          const fixedSkip = (el) => {
            for (let a = el; a && a !== document.body; a = a.parentElement) {
              const cs = getComputedStyle(a);
              if (cs.position === 'fixed') {
                const b = a.getBoundingClientRect();
                const off = b.bottom < 0 || b.top > vh;
                const skipish =
                  /skip/i.test(a.getAttribute('class') || '') ||
                  (a.tagName === 'A' && (a.getAttribute('href') || '').startsWith('#'));
                return off && skipish;
              }
            }
            return false;
          };
          const offenders = [];
          if (over > 1) {
            for (const el of document.querySelectorAll('body *')) {
              const b = el.getBoundingClientRect();
              if (b.width && b.right > vw + 1 && b.left < vw) {
                if (inHRail(el) || fixedSkip(el)) continue;
                const cls = (el.getAttribute('class') || '').slice(0, 60);
                offenders.push(`${el.tagName.toLowerCase()}.${cls}`.slice(0, 90));
                if (offenders.length >= 5) break;
              }
            }
          }
          return { over, offenders };
        });
        let ok = r.over <= 1;
        let homeNote = '';
        if (route === '/') {
          const home = await p.evaluate(() => {
            const shell = document.querySelector('.atr-shell');
            const sideNav = document.querySelector('.atr-side nav');
            const mobileNav = document.querySelector('.mobile-cmd');
            if (!shell || !sideNav || !mobileNav) return { present: false };
            const navBox = mobileNav.getBoundingClientRect();
            return {
              present: true,
              shellOverflow: shell.scrollWidth - shell.clientWidth,
              navOverflowX: getComputedStyle(sideNav).overflowX,
              mobileNavVisible: navBox.width > 0 && navBox.height > 0,
              metrics: document.querySelectorAll('.atr-metric').length,
              portals: document.querySelectorAll('.world-portal').length,
              quick: document.querySelectorAll('.atr-quick a').length,
            };
          });
          const homeOk =
            home.present &&
            home.shellOverflow <= 1 &&
            /auto|scroll/.test(home.navOverflowX) &&
            home.mobileNavVisible &&
            home.metrics === 6 &&
            home.portals === 5 &&
            home.quick === 7;
          ok = ok && homeOk;
          homeNote = home.present
            ? `  home[${homeOk ? 'ok' : 'BAD'} shellOver=${home.shellOverflow} nav=${home.navOverflowX} bottom=${home.mobileNavVisible} metrics=${home.metrics} portals=${home.portals} quick=${home.quick}]`
            : '  home[missing dashboard]';
        }
        if (!ok) bad++;
        console.log(
          `${ok ? 'PASS' : 'FAIL'}  ${width}px ${route}  over=${r.over}${r.offenders.length ? '  ' + r.offenders.join(' | ') : ''}${homeNote}`,
        );
      } catch (e) {
        bad++;
        console.log(`ERR   ${width}px ${route}  ${e.message.slice(0, 80)}`);
      }
      await p.close();
    }
  }
  await b.close();
  console.log(`\n${24 - bad}/24 clean`);
  if (bad) process.exit(1);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
