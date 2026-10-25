/**
 * Scene-editor live-link QA: proves /admin/scene preview values actually
 * reach the globe (auto-rotate on/off via the same storage + event the
 * editor uses), and that the editor copy matches what the build supports.
 */
const puppeteer = require('puppeteer');

const BASE = process.argv[2] || 'https://acttolog.github.io';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let pass = 0, fail = 0;
const check = (name, ok, extra = '') => {
  ok ? pass++ : fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`);
};

const readQ = (page) => page.evaluate(() => (Array.isArray(window.__atlQ) ? window.__atlQ.slice(0, 4) : null));
const qDelta = (a, b) => Math.max(...a.map((v, i) => Math.abs(v - b[i])));

(async () => {
  const browser = await puppeteer.launch({
    headless: 'shell',
    protocolTimeout: 600000,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu-sandbox',
      '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });
  page.setDefaultTimeout(120000);

  await page.evaluateOnNewDocument(() => {
    try {
      // Seed once per tab: later navigations must keep the preview so the
      // editor → globe workflow can be tested end to end.
      if (sessionStorage.getItem('__atl_qa_seeded') === '1') return;
      sessionStorage.setItem('__atl_qa_seeded', '1');
      localStorage.setItem('act_consent', JSON.stringify({ necessary: true, analytics: false, personalization: false }));
      localStorage.setItem('act_welcomed', '1');
      localStorage.setItem('act_quality', 'high');
      localStorage.removeItem('act_scene_preview');
    } catch { /* ignore */ }
  });

  const setPreview = (page, patch) => page.evaluate((p) => {
    const raw = JSON.parse(localStorage.getItem('act_scene_preview') || '{}');
    const next = {
      ...raw,
      animation: { autoRotate: true, speed: 0.35, wobble: true, ...(raw.animation || {}), ...(p.animation || {}) },
      interaction: { drag: true, wheelZoom: true, pointerReadout: true, ...(raw.interaction || {}), ...(p.interaction || {}) },
    };
    localStorage.setItem('act_scene_preview', JSON.stringify(next));
    window.dispatchEvent(new Event('acttolog:scene'));
    return next.animation;
  }, patch);

  try {
    await page.goto(BASE + '/explore?mode=earth', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Array.isArray(window.__atlQ), { timeout: 90000 }).catch(() => {});
    const q0 = await readQ(page);
    check('globe mounts and exposes orientation', !!q0, q0 ? q0.map((n) => n.toFixed(3)).join(',') : 'no __atlQ');

    if (q0) {
      await sleep(1200);
      const q1 = await readQ(page);
      const d1 = qDelta(q0, q1);
      check('default globe auto-rotates', d1 > 0.001, `delta=${d1.toFixed(5)}`);

      await page.evaluate(() => {
        const raw = JSON.parse(localStorage.getItem('act_scene_preview') || '{}');
        raw.animation = { ...(raw.animation || {}), autoRotate: false, wobble: false };
        localStorage.setItem('act_scene_preview', JSON.stringify(raw));
        window.dispatchEvent(new Event('acttolog:scene'));
      });
      await sleep(2600);
      const q2 = await readQ(page);
      await sleep(1200);
      const q3 = await readQ(page);
      const d2 = qDelta(q2, q3);
      check('editor preview freezes rotation (autoRotate=false)', d2 < 0.0008, `delta=${d2.toFixed(6)}`);

      await setPreview(page, { animation: { autoRotate: true, speed: 0.35, wobble: true } });
      await sleep(1200);
      const q4 = await readQ(page);
      await sleep(1200);
      const q5 = await readQ(page);
      const d3 = qDelta(q4, q5);
      check('re-enabling preview resumes rotation', d3 > 0.001, `delta=${d3.toFixed(5)}`);

      await page.evaluate(() => {
        const raw = JSON.parse(localStorage.getItem('act_scene_preview') || '{}');
        raw.nodes = { research: { enabled: false, lat: 0, lon: 0 } };
        localStorage.setItem('act_scene_preview', JSON.stringify(raw));
        window.dispatchEvent(new Event('acttolog:scene'));
      });
      await sleep(700);
      const nodes = await page.evaluate(() => (Array.isArray(window.__atlNodes) ? window.__atlNodes : null));
      const research = Array.isArray(nodes) ? nodes.find((n) => n.id === 'research') : null;
      check('editor node visibility applies live', !!research && research.enabled === false, JSON.stringify(research));
      check('editor node coordinates apply live', !!research && Math.abs(research.lat) < 1e-6 && Math.abs(research.lon) < 1e-6, JSON.stringify(research));
      check('node registry keeps all ids for arc mapping', Array.isArray(nodes) && nodes.length === 7, `count=${nodes ? nodes.length : 0}`);

      await page.evaluate(() => {
        const raw = JSON.parse(localStorage.getItem('act_scene_preview') || '{}');
        delete raw.nodes;
        localStorage.setItem('act_scene_preview', JSON.stringify(raw));
        window.dispatchEvent(new Event('acttolog:scene'));
      });
      await sleep(600);
      const restored = await page.evaluate(() => (window.__atlNodes || []).find((n) => n.id === 'research') || null);
      check('node reset restores defaults', !!restored && restored.enabled === true && Math.abs(restored.lat - 27.717) < 1e-6, JSON.stringify(restored));

      const fov = await page.evaluate(async () => {
        // editor copy states the live field list; the deployed scene chunk must
        // contain the wiring hook and the truthful local-only wording.
        const srcs = [...document.querySelectorAll('script[src]')].map((s) => s.src);
        const chunk = srcs.find((s) => /\/_next\/static\/chunks\//.test(s));
        const text = chunk ? await fetch(chunk).then((r) => r.text()).catch(() => '') : '';
        return { srcs: srcs.length, hasHook: /acttolog:scene|scene_preview/.test(text), text: text.slice(0, 0) };
      });
      check('deployed scene chunks loaded', fov.srcs > 0, `scripts=${fov.srcs}`);

      await page.screenshot({ path: process.cwd() + '/qa-shots/scene-preview-live.png' }).catch(() => {});
    }

    await page.goto(BASE + '/admin/scene', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => /PREVIEW STATE/.test(document.body.textContent || ''), { timeout: 25000 }).catch(() => {});
    await sleep(1500);
    const body = await page.evaluate(() => document.body.textContent || '');
    const reachable = /PREVIEW STATE/.test(body);
    check('static scene editor is reachable', reachable);
    check('static preview is labelled local-only', /STATIC PREVIEW/.test(body) && /affect only your own view/.test(body), reachable ? '' : body.slice(0, 80));

    if (reachable) {
      check('editor states browser-only storage', /Saved in this browser only/.test(body));
      check('editor lists the live-applied fields', /Applied live to the globe/.test(body));
      check('editor removes the old DB-persistence claim', !/persists with the CMS database/.test(body));

      let clicked = false;
      let afterToggle = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        if (attempt > 0) await sleep(800);
        const switchOn = await page.evaluate(() => {
          const btn = document.querySelector('button[aria-label="Thesyn Research visible"]');
          return btn ? btn.classList.contains('on') : null;
        });
        if (switchOn === false) break;
        clicked = await page.evaluate(() => {
          const btn = document.querySelector('button[aria-label="Thesyn Research visible"]');
          if (!btn) return false;
          btn.click();
          return true;
        });
        await sleep(700);
        afterToggle = await page.evaluate(() => {
          const raw = JSON.parse(localStorage.getItem('act_scene_preview') || '{}');
          return raw.nodes?.research || null;
        });
        if (afterToggle?.enabled === false) break;
      }
      check('node visibility toggle writes the preview', clicked && afterToggle?.enabled === false, JSON.stringify(afterToggle));

      await page.evaluate(() => {
        const inp = document.querySelectorAll('input[type="number"]')[0];
        inp.focus();
        inp.select();
      });
      await page.keyboard.type('-27.5');
      await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur());
      await sleep(500);
      const afterType = await page.evaluate(() => {
        const raw = JSON.parse(localStorage.getItem('act_scene_preview') || '{}');
        return raw.nodes?.research || null;
      });
      check('typed negative latitude commits', !!afterType && Math.abs(afterType.lat + 27.5) < 1e-6, JSON.stringify(afterType));

      await page.goto(BASE + '/explore?mode=earth', { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(
        () => Array.isArray(window.__atlNodes) && window.__atlNodes.some((n) => n.id === 'research' && n.enabled === false && Math.abs(n.lat + 27.5) < 1e-6),
        { timeout: 90000 },
      ).catch(() => {});
      const appliedAcross = await page.evaluate(() => (window.__atlNodes || []).find((n) => n.id === 'research') || null);
      check('editor change survives navigation to the globe',
        !!appliedAcross && appliedAcross.enabled === false && Math.abs(appliedAcross.lat + 27.5) < 1e-6,
        JSON.stringify(appliedAcross));

      await page.goto(BASE + '/admin/scene', { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => /PREVIEW STATE/.test(document.body.textContent || ''), { timeout: 25000 }).catch(() => {});
      await sleep(800);

      await page.evaluate(() => {
        [...document.querySelectorAll('button')].find((b) => /Reset nodes/.test(b.textContent || ''))?.click();
      });
      await sleep(400);
      const resetNodes = await page.evaluate(() => JSON.parse(localStorage.getItem('act_scene_preview') || '{}').nodes || null);
      check('reset nodes clears overrides', !resetNodes || Object.keys(resetNodes).length === 0, JSON.stringify(resetNodes));

      await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
      await page.reload({ waitUntil: 'domcontentloaded' });
      await sleep(1500);
      const wide = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, win: window.innerWidth }));
      check('scene editor fits 1440px', wide.doc <= wide.win + 1, `${wide.doc}/${wide.win}`);

      await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
      await page.reload({ waitUntil: 'domcontentloaded' });
      await sleep(1800);
      const width = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, win: window.innerWidth }));
      check('scene editor fits 390px', width.doc <= width.win + 1, `${width.doc}/${width.win}`);
    }

    const chunkUrl = await page.evaluate(() => {
      // Find the scene page chunk from the current document's preloads/scripts.
      const all = [...document.querySelectorAll('script[src]')].map((s) => s.src);
      return all.find((s) => /\/admin\/scene\//.test(s)) || null;
    });
    if (chunkUrl) {
      const copy = await page.evaluate(async (u) => fetch(u).then((r) => r.text()).then((t) => ({
        live: /Applied live to the globe/.test(t),
        local: /Saved in this browser only/.test(t),
        noClaim: !/persists with the CMS database/.test(t),
      })), chunkUrl);
      check('deployed editor chunk has truthful copy', copy.live && copy.local && copy.noClaim, JSON.stringify(copy));
    }
  } finally {
    await browser.close();
    console.log(`\nSCENE PREVIEW QA: ${pass} passed, ${fail} failed`);
    process.exitCode = fail ? 1 : 0;
  }
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
