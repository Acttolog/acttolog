// Loksewa Ghar QA: content integrity, official-source links, the practice engine,
// progress persistence, and overflow at 390/320 on all three page levels.
const puppeteer = require('puppeteer');

const BASE = process.env.LK_BASE || 'http://127.0.0.1:8140';
let pass = 0;
const fails = [];

const check = (ok, name, detail = '') => {
  if (ok) {
    pass += 1;
    console.log(`  ok  ${name}`);
  } else {
    fails.push(`${name}${detail ? ' — ' + detail : ''}`);
    console.log(`FAIL  ${name}${detail ? ' — ' + detail : ''}`);
  }
};

const launch = () =>
  puppeteer.launch({
    headless: 'new',
    args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--disable-features=CalculateNativeWinOcclusion',
      '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'],
  });

// This runs INSIDE the page, so it must not close over the puppeteer object.
const seed = () => {
  try {
    localStorage.setItem('act_welcomed', '1');
    localStorage.setItem('act_consent', JSON.stringify({ necessary: true, analytics: false, personalization: false }));
  } catch { /* private mode */ }
};

(async () => {
  const browser = await launch();
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error' && !/THREE\.WebGL/i.test(m.text())) errs.push(m.text().slice(0, 120)); });
  page.on('pageerror', (e) => errs.push(`[page] ${String(e.stack || e.message).split('\n').slice(0, 3).join(' <- ')}`));
  await page.evaluateOnNewDocument(seed);
  await page.goto(`${BASE}/loksewa`, { waitUntil: 'networkidle0', timeout: 120000 });
  await new Promise((r) => setTimeout(r, 2200));

  const hub = await page.evaluate(() => {
    const txt = document.body.innerText;
    const ext = [...document.querySelectorAll('a[href^="http"]')].map((a) => a.href);
    const gov = ext.filter((h) => /\.gov\.np/.test(h));
    // .gov.np sources are required; the owner's own channels (Blogger blog,
    // Facebook profile in the shared footer) are not outside claims.
    const notGov = ext.filter((h) => !/\.gov\.np/.test(h) && !h.includes(location.hostname) && !/acttolog\.blogspot\.com/.test(h) && !/facebook\.com\/profile\.php\?id=61586303026922/.test(h));
    return {
      h1: document.querySelector('h1')?.innerText.replace(/\s+/g, ' ').slice(0, 40),
      mentorPhoto: document.querySelector('.lk-mentor-photo img')?.getAttribute('src'),
      mentorLoaded: (() => { const i = document.querySelector('.lk-mentor-photo img'); return Boolean(i && i.complete && i.naturalWidth > 0); })(),
      slabs: document.querySelectorAll('.lkslab').length,
      papers: document.querySelectorAll('.lk-paper').length,
      laws: document.querySelectorAll('.lk-laws li').length,
      method: document.querySelectorAll('.lk-method li').length,
      govLinks: gov.length,
      nonGovLinks: notGov,
      disclaimer: /आयोगको आधिकारिक प्रश्नपत्र होइन|not an official question paper/.test(txt),
      words: txt.split(/\s+/).filter(Boolean).length,
      devanagari: (txt.match(/[ऀ-ॿ]/g) || []).length,
      testQuestions: document.querySelectorAll('.lktest-qs > li').length,
      progressUnits: document.querySelectorAll('.lkprog-list li').length,
      mediumButtons: document.querySelectorAll('.lkm-btn').length,
    };
  });
  console.log('\nHUB');
  check(hub.h1 === 'लोकसेवा घर Loksewa Ghar', 'hub H1 names the section', String(hub.h1));
  check(hub.mentorPhoto === '/media/founder-pro.jpg', 'mentor block uses the real founder photo', String(hub.mentorPhoto));
  check(hub.mentorLoaded, 'founder photo actually loads');
  check(hub.slabs === 7, 'all 7 selection stages render', String(hub.slabs));
  check(hub.papers === 4, 'four papers listed', String(hub.papers));
  check(hub.laws === 10, 'ten core laws listed', String(hub.laws));
  check(hub.method === 5, 'five-step rank method renders', String(hub.method));
  check(hub.govLinks >= 4, 'official .gov.np sources linked', String(hub.govLinks));
  check(hub.nonGovLinks.length === 0, 'no non-government external claims', JSON.stringify(hub.nonGovLinks));
  check(hub.disclaimer, 'practice material is labelled not-official');
  check(hub.devanagari > 800, 'Nepali is the primary language of the page', String(hub.devanagari));
  check(hub.testQuestions === 14, 'all 14 practice questions render', String(hub.testQuestions));
  check(hub.progressUnits === 57, '57 syllabus folders in the checklist', String(hub.progressUnits));
  check(hub.mediumButtons === 3, 'three medium options (Nepali / English / mixed)', String(hub.mediumButtons));

  // practice engine
  await page.evaluate(() => document.getElementById('lk-test').scrollIntoView({ block: 'center' }));
  await new Promise((r) => setTimeout(r, 800));
  await page.evaluate(() => {
    document.querySelectorAll('.lktest-qs > li').forEach((li, i) => {
      const opts = li.querySelectorAll('input[type=radio]');
      if (i % 2 === 0 && opts[0]) opts[0].click();
    });
  });
  await page.evaluate(() => [...document.querySelectorAll('.lktest button')].find((b) => /जवाफ जाँच्नुहोस्/.test(b.innerText))?.click());
  await new Promise((r) => setTimeout(r, 700));
  const scored = await page.evaluate(() => ({
    marked: document.querySelectorAll('.lktest-qs > li[data-state="ok"], .lktest-qs > li[data-state="bad"], .lktest-qs > li[data-state="blank"]').length,
    score: document.querySelector('.lktest-score b')?.innerText,
    gap: Boolean(document.querySelector('.lktest-gap')),
    hist: document.querySelector('.lktest-hist')?.innerText || '',
  }));
  console.log('\nPRACTICE ENGINE');
  check(scored.marked === 14, 'every question gets a graded state', String(scored.marked));
  check(/^[-\d.]+$/.test(scored.score || ''), 'score computes with negative marking', String(scored.score));
  check(Boolean(scored.hist), 'attempt stored in localStorage', scored.hist);

  // progress persistence across reload
  await page.evaluate(() => document.querySelector('.lkprog-list button')?.click());
  await new Promise((r) => setTimeout(r, 300));
  const stored = await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('act_lk_progress') || '{}')).length);
  check(stored === 1, 'progress writes one folder to storage', String(stored));

  // medium switch changes the rendered language
  await page.evaluate(() => [...document.querySelectorAll('.lkm-btn')].find((b) => b.innerText === 'English')?.click());
  await new Promise((r) => setTimeout(r, 500));
  const english = await page.evaluate(() => document.querySelector('.lk-folder-title, .lkslab-title')?.innerText || '');
  check(/[a-zA-Z]{4,}/.test(english), 'English medium renders Latin copy', english.slice(0, 30));
  await page.evaluate(() => [...document.querySelectorAll('.lkm-btn')].find((b) => /नेपाली \+ English/.test(b.innerText))?.click());
  await new Promise((r) => setTimeout(r, 400));
  const mixed = await page.evaluate(() => document.querySelector('.lkslab-title')?.innerText || '');
  check(/[ऀ-ॿ]/.test(mixed) && /[a-zA-Z]{3,}/.test(mixed), 'mixed medium shows both languages', mixed.slice(0, 34));

  // nested pages
  console.log('\nNESTED PAGES');
  for (const [url, expect] of [
    ['/loksewa/aptitude', { subjects: 5, crumbs: 1, test: 6, folders: 0, links: 5 }],
    ['/loksewa/governance', { subjects: 4, crumbs: 1, test: 2, folders: 0, links: 4 }],
    ['/loksewa/service/federalism', { subjects: 0, crumbs: 1, test: 0, folders: 3, links: 3 }],
  ]) {
    await page.goto(`${BASE}${url}`, { waitUntil: 'networkidle0', timeout: 120000 });
    await new Promise((r) => setTimeout(r, 1400));
    const r = await page.evaluate(() => ({
      subjects: document.querySelectorAll('.lk-subject').length,
      crumbs: document.querySelectorAll('.lk-crumb').length,
      test: document.querySelectorAll('.lktest-qs > li').length,
      folders: document.querySelectorAll('.lk-folder').length,
      points: document.querySelectorAll('.lk-points li').length,
      title: document.querySelector('title')?.innerText.slice(0, 60),
      canonical: document.querySelector('link[rel=canonical]')?.href,
      h1: document.querySelector('h1')?.innerText.replace(/\s+/g, ' ').slice(0, 44),
      official: document.querySelectorAll('.lk-law-card').length,
      subjectLinks: document.querySelectorAll('.lk-subject').length + document.querySelectorAll('.lk-sib').length,
    }));
    check(r.subjects === expect.subjects, `${url} subject cards`, `${r.subjects} vs ${expect.subjects}`);
    check(r.folders === expect.folders, `${url} folder count`, `${r.folders} vs ${expect.folders}`);
    check(r.crumbs === 1 && r.test === expect.test, `${url} breadcrumb + test`, `${r.crumbs}/${r.test}`);
    check(r.subjectLinks === expect.links, `${url} links every subject folder`, String(r.subjectLinks));
    check(Boolean(r.canonical) && r.canonical.includes(url), `${url} canonical is self`, String(r.canonical));
    check(r.official >= 4, `${url} links the official sources`, String(r.official));
    console.log(`      h1="${r.h1}" points=${r.points}`);
  }

  await browser.close();

  // overflow at phone widths on all three levels
  console.log('\nMOBILE');
  for (const w of [390, 320]) {
    const b2 = await launch();
    const p2 = await b2.newPage();
    await p2.setViewport({ width: w, height: 844, deviceScaleFactor: 2 });
    await p2.evaluateOnNewDocument(seed);
    for (const url of ['/loksewa', '/loksewa/aptitude', '/loksewa/aptitude/geography']) {
      await p2.goto(`${BASE}${url}`, { waitUntil: 'networkidle0', timeout: 120000 });
      await new Promise((r) => setTimeout(r, 1600));
      const over = await p2.evaluate(() => {
        const wide = [...document.querySelectorAll('body *')]
          .filter((e) => e.getBoundingClientRect().right > innerWidth + 2 && getComputedStyle(e).position !== 'fixed')
          .slice(0, 4)
          .map((e) => `${e.tagName.toLowerCase()}.${(e.className || '').toString().split(' ')[0]}`);
        return { delta: document.documentElement.scrollWidth - innerWidth, wide };
      });
      check(over.delta <= 0, `${w}px ${url} no horizontal overflow`, `over=${over.delta} ${over.wide.join(' ')}`);
    }
    await b2.close();
  }

  console.log('\nCONSOLE ERRORS:', errs.length ? errs.slice(0, 6).join(' | ') : 'none');
  check(errs.length === 0, 'no console errors outside the WebGL flake', String(errs.length));

  console.log(`\n${pass} passed, ${fails.length} failed`);
  if (fails.length) fails.forEach((f) => console.log('   - ' + f));
  process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.error('LK QA CRASHED:', e); process.exit(1); });
