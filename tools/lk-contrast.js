#!/usr/bin/env node
/*
 * Contrast probe for the Loksewa download surfaces.
 *
 * Walks every visible text node, resolves the effective background by walking
 * up to the nearest painted ancestor, and reports WCAG ratios. This is the
 * measurement the design floor asks for: body text >= 4.5:1, large >= 3:1.
 *
 *   LK_BASE=http://127.0.0.1:3100 node tools/lk-contrast.js
 */
const puppeteer = require('puppeteer');

const BASE = process.env.LK_BASE || 'http://127.0.0.1:3100';
const PAGES = ['/loksewa/downloads', '/loksewa/explorer', '/loksewa/print/planner', '/loksewa/print/aptitude'];

const probe = () => {
  const lum = (c) => {
    const f = (v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  };
  const parse = (s) => {
    const m = (s || '').match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(',').map((v) => parseFloat(v));
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  };
  const over = (fg, bg) => {
    // composite a translucent colour over an opaque one
    const a = fg.a;
    return { r: fg.r * a + bg.r * (1 - a), g: fg.g * a + bg.g * (1 - a), b: fg.b * a + bg.b * (1 - a), a: 1 };
  };
  const ratio = (a, b) => {
    const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
    return (l1 + 0.05) / (l2 + 0.05);
  };

  const out = [];
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2 || r.bottom < 0 || r.top > innerHeight * 3) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) < 0.15) continue;
    const text = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(' ');
    if (text.length < 3) continue;

    let bg = null;
    let node = el;
    while (node && !bg) {
      const c = parse(getComputedStyle(node).backgroundColor);
      if (c && c.a > 0.85) bg = c;
      node = node.parentElement;
    }
    if (!bg) bg = parse(getComputedStyle(document.body).backgroundColor) || { r: 5, g: 6, b: 12, a: 1 };
    const fgRaw = parse(cs.color);
    if (!fgRaw) continue;
    const fg = fgRaw.a < 1 ? over(fgRaw, bg) : fgRaw;
    const px = parseFloat(cs.fontSize);
    const bold = Number(cs.fontWeight) >= 700;
    const large = px >= 24 || (px >= 18.66 && bold);
    const need = large ? 3 : 4.5;
    const cr = ratio(fg, bg);
    if (cr < need) {
      out.push({
        sel: `${el.tagName.toLowerCase()}.${(el.className || '').toString().split(' ')[0]}`,
        text: text.slice(0, 34),
        px: Math.round(px),
        cr: Number(cr.toFixed(2)),
        need,
      });
    }
  }
  return out.sort((a, b) => a.cr - b.cr).slice(0, 14);
};

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--disable-features=CalculateNativeWinOcclusion'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 950 });
  let total = 0;
  for (const url of PAGES) {
    await page.goto(`${BASE}${url}`, { waitUntil: 'networkidle0', timeout: 120000 });
    // scroll so reveals finish and below-the-fold text is measured as painted
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += innerHeight * 0.7) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 120));
      }
      window.scrollTo(0, 0);
    });
    await new Promise((r) => setTimeout(r, 1200));
    const bad = await page.evaluate(probe);
    total += bad.length;
    console.log(`\n${url} — ${bad.length} below WCAG AA`);
    for (const b of bad) console.log(`  ${String(b.cr).padStart(5)} / ${b.need}  ${b.px}px  ${b.sel}  "${b.text}"`);
  }
  await browser.close();
  console.log(`\ntotal flagged: ${total}`);
  process.exit(0);
})().catch((e) => {
  console.error('LK CONTRAST CRASHED:', e);
  process.exit(1);
});
