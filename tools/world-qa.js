/**
 * ACTTOLOG world-upgrade QA — targeted checks for the new features.
 * Hardened for software-WebGL sandboxes: one page reused, heavy /media
 * imagery blocked, per-step isolation, generous protocol timeout.
 */
const puppeteer = require('puppeteer');
const fs = require('fs');

const BASE = process.argv[2] || 'http://127.0.0.1:3100';
const OUT = process.cwd() + '/qa-shots/world';
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let pass = 0, fail = 0;
const errors = [];
const check = (name, ok, extra = '') => { ok ? pass++ : fail++; console.log(`${ok ? '✅' : '❌'} ${name}${extra ? ' — ' + extra : ''}`); };

(async () => {
  const browser = await puppeteer.launch({
    headless: 'shell',
    protocolTimeout: 600000,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu-sandbox',
      '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'],
  });

  let page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  page.setDefaultTimeout(120000);
  page.on('pageerror', (e) => errors.push('pageerror: ' + String(e).slice(0, 160)));
  page.on('console', (m) => { if (m.type() === 'error' && !/tile\.openstreetmap|nominatim|overpass|arcgisonline|unpkg|Failed to load resource|net::ERR/i.test(m.text())) errors.push('console: ' + m.text().slice(0, 160)); });
  await page.setRequestInterception(true);
  page.on('request', (r) => {
    const u = r.url();
    if (/\/media\/.*\.jpg/.test(u)) return r.abort().catch(() => {}); // 5MB hero imagery — not under test
    r.continue().catch(() => {});
  });
  const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` }).catch(() => {});
  const ensurePage = async () => {
    if (page && !page.isClosed()) return;
    console.log('   (renderer died — recreating page)');
    page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
    page.setDefaultTimeout(120000);
    page.on('pageerror', (e) => errors.push('pageerror: ' + String(e).slice(0, 160)));
    await page.setRequestInterception(true);
    page.on('request', (r) => { const u = r.url(); if (/\/media\/.*\.jpg/.test(u)) return r.abort().catch(() => {}); r.continue().catch(() => {}); });
  };
  const step = async (label, fn) => {
    try { await fn(); } catch (e) { fail++; console.log(`❌ STEP ${label} crashed — ${String(e.message || e).slice(0, 140)}`); await ensurePage().catch(() => {}); }
  };
  const txt = () => page.evaluate(() => document.body.textContent || '');

  // ── 1. Home: first-visit overlay + hero + nav + worlds row ────────
  await step('home', async () => {
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    await sleep(1500);
    // decide consent first (welcome must never stack on the consent dialog)
    await page.evaluate(() => { [...document.querySelectorAll('#consent button')].find((b) => /Necessary only/i.test(b.textContent))?.click(); });
    await page.waitForSelector('.fv-card', { timeout: 25000 }).catch(() => {});
    const fv = await page.evaluate(() => {
      const card = document.querySelector('.fv-card');
      return card ? card.textContent : null;
    });
    check('FirstVisit overlay shows on first load', !!fv && /WELCOME TO ACTTOLOG WORLD/.test(fv || ''), (fv || '').slice(0, 60));
    await shot('01-first-visit');
    const actions = await page.evaluate(() => [...document.querySelectorAll('.fv-card button')].map((b) => b.textContent.trim()));
    check('FirstVisit actions: EXPLORE EARTH / ENTER ACTTOLOG / SEARCH WORLD / Skip',
      actions.some((a) => /EXPLORE EARTH/i.test(a)) && actions.some((a) => /ENTER ACTTOLOG/i.test(a)) && actions.some((a) => /SEARCH WORLD/i.test(a)) && actions.some((a) => /Skip/i.test(a)),
      actions.join(' | '));
    await page.evaluate(() => [...document.querySelectorAll('.fv-card button')].find((b) => /Skip/i.test(b.textContent))?.click());
    await sleep(500);
    check('FirstVisit skip dismisses + persists', await page.evaluate(() => !document.querySelector('.fv-card') && localStorage.getItem('act_welcomed') === '1'));
    const hero = await page.evaluate(() => [...document.querySelectorAll('.hero a.btn, .hero button.btn')].map((b) => ({ t: b.textContent.trim(), h: b.getAttribute('href') })));
    check('Hero: Explore Earth → /explore?mode=earth', hero.some((x) => /Explore Earth/i.test(x.t) && x.h === '/explore?mode=earth'), JSON.stringify(hero));
    check('Hero: Search World button', hero.some((x) => /Search World/i.test(x.t)));
    const nav = await page.evaluate(() => [...document.querySelectorAll('.nlink')].map((a) => ({ t: a.textContent.trim(), h: a.getAttribute('href') })));
    check('Header nav has World → /explore', nav.some((x) => x.t === 'World' && x.h === '/explore'), nav.map((x) => x.t).join('|'));
    check('Hero deck COMMAND CENTER button', await page.evaluate(() => [...document.querySelectorAll('.chip')].some((c) => /COMMAND CENTER/i.test(c.textContent))));
    const worlds = await page.evaluate(() => [...document.querySelectorAll('a.chip')].filter((a) => (a.getAttribute('href') || '').includes('mode=360&world=')).length);
    check('Home lists all 11 ACTTOLOG 360 worlds', worlds === 11, `${worlds} chips`);
  });

  // ── 2. ⌘K palette: world commands + places ────────────────────────
  await step('cmdk', async () => {
    await page.evaluate(() => localStorage.setItem('act_welcomed', '1'));
    await page.keyboard.down('Control'); await page.keyboard.press('KeyK'); await page.keyboard.up('Control');
    await page.waitForSelector('[role="dialog"][aria-modal="true"] input', { timeout: 40000 }).catch(() => {});
    const cmds = await page.evaluate(() => {
      const d = [...document.querySelectorAll('[role="dialog"][aria-modal="true"]')].pop();
      return d ? d.textContent : '';
    });
    check('⌘K shows WORLD COMMANDS (Earth/Map/Sat/360/Research/Academy/Games/Darkroom/AI/My)',
      /WORLD COMMANDS/.test(cmds) && /Go to Earth/.test(cmds) && /Open Satellite/.test(cmds) && /Open Research/.test(cmds) && /Open My ACTTOLOG/.test(cmds));
    await shot('03-cmdk-commands');
    // run a command BEFORE typing (typing filters commands by relevance)
    await page.evaluate(() => {
      const d = [...document.querySelectorAll('[role="dialog"][aria-modal="true"]')].pop();
      [...d.querySelectorAll('button')].find((b) => /Go to Earth/i.test(b.textContent))?.click();
    });
    for (let i2 = 0; i2 < 24 && !page.url().includes('/explore'); i2++) await sleep(500);
    check('"Go to Earth" command → /explore?mode=earth (§26)', page.url().includes('/explore?mode=earth'), page.url());
    // palette on /explore: places deep-link re-applies live (§18 + §22)
    await page.keyboard.down('Control'); await page.keyboard.press('KeyK'); await page.keyboard.up('Control');
    await page.waitForSelector('[role="dialog"][aria-modal="true"] input', { timeout: 40000 });
    await page.evaluate(() => { const d = [...document.querySelectorAll('[role="dialog"][aria-modal="true"]')].pop(); d.querySelector('input').focus(); });
    await page.keyboard.type('Kathmandu');
    await sleep(4000);
    const res = await page.evaluate(() => {
      const d = [...document.querySelectorAll('[role="dialog"][aria-modal="true"]')].pop();
      const links = [...(d ? d.querySelectorAll('a') : [])].map((a) => a.getAttribute('href') || '');
      return { text: d ? d.textContent : '', links };
    });
    const hasPlaces = /PLACES/.test(res.text) && res.links.some((h) => h.includes('/explore?mode=map&lat=27.7'));
    check('⌘K "Kathmandu" → PLACES with /explore deep links', hasPlaces, hasPlaces ? '' : '(Nominatim may be blocked in sandbox)');
    await shot('04-cmdk-places');
    const clickedPlace = await page.evaluate(() => {
      const d = [...document.querySelectorAll('[role="dialog"][aria-modal="true"]')].pop();
      const a = [...d.querySelectorAll('a')].find((x) => (x.getAttribute('href') || '').includes('/explore?mode=map&lat=27.7'));
      if (!a) return null;
      a.click();
      return a.getAttribute('href');
    });
    if (clickedPlace) {
      for (let i2 = 0; i2 < 16; i2++) { await sleep(500); const ok = await page.evaluate(() => !!document.querySelector('aside[aria-label="Place details"]')); if (ok) break; }
      const applied = await page.evaluate(() => ({
        panel: !!document.querySelector('aside[aria-label="Place details"]'),
        url: window.location.search,
      }));
      check('Place link while already on /explore re-applies live (panel + URL)', applied.panel && /place=/.test(applied.url) && /mode=map/.test(applied.url) && /lat=27\.7/.test(applied.url), JSON.stringify(applied));
    } else {
      check('Place link while already on /explore re-applies live (panel + URL)', false, 'no place link (network blocked?)');
    }
  });

  // ── 3. /explore: modes, keyboard, place sync, discover, presets ───
  await step('explore', async () => {
    await page.goto(BASE + '/explore', { waitUntil: 'domcontentloaded' });
    await sleep(4200); // boot + earth spin-up under swiftshader
    await shot('05-explore-earth');
    const modes = await page.evaluate(() => [...document.querySelectorAll('.chip')].map((c) => c.textContent.trim()));
    check('Mode bar EARTH·MAP·SAT·360·SEARCH', ['EARTH', 'MAP', 'SAT', '360', 'SEARCH'].every((m) => modes.includes(m)), modes.slice(0, 6).join('|'));
    await page.keyboard.press('Digit2');
    await sleep(2200);
    check('Keyboard "2" → MAP mode', /mode=map/.test(await page.evaluate(() => window.location.search)));
    const before = await page.evaluate(() => window.location.search);
    await page.keyboard.press('KeyW'); await sleep(900);
    const after = await page.evaluate(() => window.location.search);
    check('W pans map (URL lat changes — §14 real WASD)', before !== after && /lat=/.test(after), `${before} → ${after}`);
    const latBefore = (after.match(/lat=([\d.-]+)/) || [])[1];
    await page.keyboard.press('Digit3');
    await sleep(2200);
    const satUrl = await page.evaluate(() => window.location.search);
    check('SAT preserves location (§21 WOW3)', /mode=sat/.test(satUrl) && latBefore === (satUrl.match(/lat=([\d.-]+)/) || [])[1], satUrl);
    await shot('06-explore-sat');
    await page.keyboard.press('Digit1'); await sleep(1800);
    await page.evaluate(() => [...document.querySelectorAll('.chip')].find((c) => /DISCOVER/i.test(c.textContent))?.click());
    await sleep(800);
    const dText = await txt();
    check('DISCOVER drawer with curated cards (§25)', dText.includes('WORLD EXPLORATION') && dText.includes('Mount Everest') && dText.includes('CERN'));
    await shot('07-discover');
    await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => /Mount Everest/.test(b.textContent))?.click());
    await sleep(2500);
    const panel = await page.evaluate(() => { const a = document.querySelector('aside[aria-label="Place details"]'); return a ? a.textContent : ''; });
    check('Card → Place panel: coords + Directions + Save + Share + Ask AI',
      /PLACE/.test(panel) && /Directions/.test(panel) && /Ask AI/.test(panel) && /27\.9/.test(panel) && /Save/.test(panel) && /Share/.test(panel), panel.slice(0, 100));
    await shot('08-place-panel');
    const near = await page.evaluate(() => { const a = document.querySelector('aside[aria-label="Place details"]'); return a ? [...a.querySelectorAll('.chip')].map((c) => c.textContent.trim()) : []; });
    const needed = ['Food', 'Hotels', 'Education', 'Universities', 'Research', 'Libraries', 'Museums', 'Shopping', 'Hospitals', 'Transport', 'Tourism', 'Entertainment', 'Parks'];
    check('13 nearby categories (§20)', needed.every((n) => near.some((x) => x.endsWith(n))), near.join('|'));
    const url = page.url();
    check('Deep-link URL carries mode/lat/lng/place (§22)', /mode=/.test(url) && /lat=27\.9/.test(url) && /place=/.test(url), url);
    const presets = await page.evaluate(() => document.querySelectorAll('button[title^="Camera preset"]').length);
    check('All 9 camera presets (§15)', presets === 9, `${presets}`);
    // switch to 360 via the place panel (place preserved), then Street View honesty
    await page.evaluate(() => { const a = document.querySelector('aside[aria-label="Place details"]'); [...(a ? a.querySelectorAll('.chip') : [])].find((c) => c.textContent.trim() === '360')?.click(); });
    await sleep(2500);
    const sv = await page.evaluate(() => { const b = [...document.querySelectorAll('.chip')].find((c) => /STREET VIEW/.test(c.textContent)); if (b) { b.click(); return b.textContent.trim(); } return null; });
    await sleep(1200);
    const svText = await txt();
    check('Street View honest: CONFIGURATION REQUIRED (§53)', sv !== null && svText.includes('CONFIGURATION REQUIRED'), String(sv));
    await shot('09-streetview-honest');
    await page.keyboard.press('Escape'); await sleep(500);
    await page.keyboard.press('Digit4'); await sleep(2600);
    const pano = await page.evaluate(() => ({
      canvas: !!document.querySelector('canvas'),
      worlds: [...document.querySelectorAll('.chip')].filter((x) => /RESEARCH LAB|GAMES ARENA|INTELLIGENCE CORE|EDITORIAL/i.test(x.textContent)).length,
    }));
    check('360 mode: canvas + world switcher (11 worlds)', pano.canvas && pano.worlds >= 4, JSON.stringify(pano));
    await shot('10-explore-360');
    await page.keyboard.down('Shift'); await page.keyboard.press('Slash'); await page.keyboard.up('Shift');
    await sleep(900);
    const helpT = await txt();
    check('Help: keyboard map + GOOGLE MAPS PLATFORM setup steps (§26/§53)', helpT.includes('KEYBOARD COMMAND') && helpT.includes('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY') && helpT.includes('W A S D'));
    await shot('11-help-google');
    await page.keyboard.press('Escape');
  });

  // ── 4. Deep-link restore ──────────────────────────────────────────
  await step('deeplinks', async () => {
    await ensurePage();
    await page.goto(BASE + '/explore?mode=sat&lat=28.20960&lng=83.98560&zoom=12&place=Pokhara', { waitUntil: 'domcontentloaded' });
    await sleep(4000);
    const t = await txt();
    const hasPanel = await page.evaluate(() => !!document.querySelector('aside[aria-label="Place details"]'));
    check('Shared link restores SAT + Pokhara + panel (§22)', t.includes('ACTTOLOG / SAT') && t.includes('Pokhara') && hasPanel);
    await shot('12-deeplink-pokhara-sat');
    await page.goto(BASE + '/explore?mode=360&world=arena', { waitUntil: 'domcontentloaded' });
    await sleep(3500);
    const w = await page.evaluate(() => [...document.querySelectorAll('.chip.on')].map((c) => c.textContent.trim()));
    check('Shared link ?mode=360&world=arena → Games Arena selected', w.some((x) => /GAMES ARENA/i.test(x)), w.join('|'));
    await shot('13-deeplink-arena');
  });

  // ── 5. Section portals (§13/WOW6) ─────────────────────────────────
  await step('portals', async () => {
    await ensurePage();
    for (const [route, world, title] of [['/research', 'lab', 'Thesyn Research World'], ['/academy', 'academy', 'Academy World'], ['/games', 'arena', 'Games World'], ['/darkroom', 'darkroom', 'Darkroom World'], ['/blog', 'blog', 'Editorial World'], ['/offers', 'offers', 'Offers World'], ['/about', 'world', 'ACTTOLOG World Hub'], ['/contact', 'contact', 'Global Contact World'], ['/ai', 'ai', 'Intelligence Core'], ['/entertainment', 'cinema', 'Entertainment World']]) {
      await page.goto(BASE + route, { waitUntil: 'domcontentloaded' });
      await sleep(900);
      const p = await page.evaluate((title) => {
        const a = [...document.querySelectorAll('a.btn')].find((x) => (x.getAttribute('href') || '').includes('mode=360&world='));
        return { hasTitle: document.body.textContent.includes(title), href: a ? a.getAttribute('href') : null };
      }, title);
      check(`${route} portal "${title}" → world=${world}`, p.href === `/explore?mode=360&world=${world}` && p.hasTitle, String(p.href));
      if (route === '/research') await shot('14-research-portal');
    }
  });

  // ── 6. Mobile (§27/§28) ────────────────────────────────────────────
  await step('mobile', async () => {
    await ensurePage();
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
    await page.goto(BASE + '/explore?mode=map&lat=27.71720&lng=85.32400&zoom=12&place=Kathmandu', { waitUntil: 'domcontentloaded' });
    await sleep(4200);
    const m = await page.evaluate(() => {
      const bar = [...document.querySelectorAll('.sm\\:hidden .chip')].map((c) => c.textContent.trim());
      const sheet = document.querySelector('aside[aria-label="Place details"]');
      const r = sheet ? sheet.getBoundingClientRect() : null;
      return { bar, sheetW: r ? Math.round(r.width) : 0, vw: window.innerWidth, overflowX: document.documentElement.scrollWidth > window.innerWidth + 1 };
    });
    check('Mobile bottom command bar EARTH·MAP·SAT·360·SEARCH·FIND (§27)', ['EARTH', 'MAP', 'SAT', '360', 'SEARCH', 'FIND'].every((x) => m.bar.includes(x)), m.bar.join('|'));
    check('Mobile place sheet full-width, no h-overflow (§28)', m.sheetW > 300 && !m.overflowX, `w=${m.sheetW}/${m.vw} overflow=${m.overflowX}`);
    await shot('15-mobile-explore');
    await page.evaluate(() => [...document.querySelectorAll('.sm\\:hidden .chip')].find((c) => /FIND/.test(c.textContent))?.click());
    await sleep(800);
    check('Mobile FIND opens DISCOVER sheet', (await txt()).includes('WORLD EXPLORATION'));
    await shot('16-mobile-discover');
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    await sleep(2000);
    check('Mobile home: no horizontal overflow', !(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)));
    await shot('17-mobile-home');
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  });

  // ── 7. /search places group ───────────────────────────────────────
  await step('search-page', async () => {
    await ensurePage();
    await page.goto(BASE + '/search?q=Pokhara', { waitUntil: 'domcontentloaded' });
    await sleep(4000);
    const s = await page.evaluate(() => {
      const links = [...document.querySelectorAll('a')].map((a) => a.getAttribute('href') || '');
      return { places: document.body.textContent.includes('PLACES'), deep: links.some((h) => h.includes('/explore?mode=map&lat=')) };
    });
    check('/search?q=Pokhara → PLACES deep links (§18)', s.places && s.deep, JSON.stringify(s));
    await shot('18-search-places');
  });

  await browser.close();
  const real = errors.filter((e) => e.startsWith('pageerror'));
  console.log('\nRuntime page errors:', real.length ? '\n - ' + real.slice(0, 6).join('\n - ') : 'none');
  check('Zero runtime JS errors across all steps', real.length === 0);
  console.log(`\n═══ WORLD QA RESULT: ${pass} passed, ${fail} failed ═══`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('QA CRASHED:', e.message); process.exit(2); });
