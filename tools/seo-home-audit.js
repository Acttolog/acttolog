// Homepage SEO audit: measures head metadata, structured data, heading tree,
// alt/anchor quality, crawlable (no-JS) text, and Core Web Vital timings.
const puppeteer = require('puppeteer');

const BASE = process.env.SEO_BASE || 'https://acttolog.github.io';
const VP = { width: 1440, height: 900 };

async function status(url) {
  try {
    const res = await fetch(url, { redirect: 'follow' });
    const body = await res.text();
    return { url, code: res.status, bytes: Buffer.byteLength(body), head: body.slice(0, 160).replace(/\s+/g, ' ') };
  } catch (e) {
    return { url, code: 'ERR', bytes: 0, head: String(e.message) };
  }
}

(async () => {
  const out = { base: BASE };

  // 1. What a JS-less crawler receives.
  const raw = await (await fetch(`${BASE}/`, { headers: { 'user-agent': 'Mozilla/5.0 (compatible; seo-audit)' } })).text();
  const text = raw
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;|&#\d+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const pick = (re) => [...raw.matchAll(new RegExp(re.source, re.flags.includes('g') ? re.flags : `${re.flags}g`))].map((m) => m[1]);
  out.rawHtml = {
    bytes: Buffer.byteLength(raw),
    words: text.split(' ').filter(Boolean).length,
    title: (raw.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || null,
    description: pick(/<meta\s+name="description"\s+content="([^"]*)"/i)[0] ?? null,
    robots: pick(/<meta\s+name="robots"\s+content="([^"]*)"/i)[0] ?? null,
    canonical: pick(/<link\s+rel="canonical"\s+href="([^"]*)"/i)[0] ?? null,
    hreflang: pick(/<link[^>]+rel="alternate"[^>]+hreflang="([^"]*)"/i),
    htmlLang: (raw.match(/<html[^>]*\blang="([^"]*)"/i) || [])[1] ?? null,
    ogTags: [...raw.matchAll(/<meta\s+property="(og:[\w:]+)"\s+content="([^"]*)"/gi)].map((m) => `${m[1]}=${m[2]}`),
    twitterTags: [...raw.matchAll(/<meta\s+name="(twitter:[\w:]+)"\s+content="([^"]*)"/gi)].map((m) => `${m[1]}=${m[2]}`),
    jsonLdBlocks: (raw.match(/application\/ld\+json/gi) || []).length,
    h1: pick(/<h1[^>]*>([\s\S]*?)<\/h1>/gi).map((s) => s.replace(/<[^>]+>/g, '').trim()),
    h2: pick(/<h2[^>]*>([\s\S]*?)<\/h2>/gi).map((s) => s.replace(/<[^>]+>/g, '').trim()),
    imgTotal: (raw.match(/<img\b/gi) || []).length,
    imgNoAlt: (raw.match(/<img\b(?![^>]*\balt=)[^>]*>/gi) || []).length,
    imgEmptyAlt: (raw.match(/<img\b[^>]*\balt=""[^>]*>/gi) || []).length,
    linksInHtml: (raw.match(/<a\s/gi) || []).length,
  };

  // 2. Technical endpoints.
  out.files = {};
  for (const p of ['/robots.txt', '/sitemap.xml', '/manifest.webmanifest', '/sitemap-index.xml', '/.well-known/security.txt']) {
    const r = await status(`${BASE}${p}`);
    out.files[p] = { code: r.code, bytes: r.bytes };
  }

  // 3. Rendered page: CWV, structured data, links, media.
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--enable-unsafe-swiftshader',
      '--use-angle=swiftshader',
      '--disable-features=CalculateNativeWinOcclusion',
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding',
      '--disable-backgrounding-occluded-windows',
    ],
  });
  const page = await browser.newPage();
  await page.setViewport(VP);
  const reqs = [];
  page.on('response', (r) => reqs.push({ url: r.url(), status: r.status(), type: r.request().resourceType() }));
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle0', timeout: 120000 });
  await page.evaluate(() => {
    try { localStorage.setItem('act_welcomed', '1'); } catch { /* noop */ }
    document.querySelector('#consent button')?.click();
  });
  await new Promise((r) => setTimeout(r, 1500));

  out.rendered = await page.evaluate(() => {
    const clean = (s) => (s || '').replace(/\s+/g, ' ').trim();
    const headings = [...document.querySelectorAll('h1,h2,h3')].map((h) => ({
      tag: h.tagName.toLowerCase(),
      text: clean(h.innerText).slice(0, 90),
      hidden: h.offsetParent === null,
    }));
    const imgs = [...document.querySelectorAll('img')].map((i) => ({
      alt: clean(i.getAttribute('alt') || ''),
      hasAlt: i.hasAttribute('alt'),
      lazy: i.loading === 'lazy',
      fetchpriority: i.getAttribute('fetchpriority') || '',
      src: (i.currentSrc || i.src || '').split('/').pop().split('?')[0],
      nat: i.naturalWidth,
      box: Math.round(i.getBoundingClientRect().width),
    }));
    const anchors = [...document.querySelectorAll('a[href]')].map((a) => {
      const href = a.getAttribute('href') || '';
      return {
        href,
        text: clean(a.innerText) || clean(a.getAttribute('aria-label')) || (a.querySelector('img') ? `[img alt:${clean(a.querySelector('img').alt)}]` : '(empty)'),
        external: /^https?:\/\//i.test(href) && !href.includes(location.hostname),
      };
    });
    const ld = [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => {
      try { return JSON.parse(s.textContent); } catch { return { PARSE_ERROR: true }; }
    });
    const types = [];
    const walk = (n) => {
      if (!n || typeof n !== 'object') return;
      if (Array.isArray(n)) return n.forEach(walk);
      if (n['@type']) types.push(n['@type']);
      Object.values(n).forEach(walk);
    };
    ld.forEach(walk);
    const org = JSON.stringify(ld).match(/"address"|"sameAs"|"logo"/g) || [];
    const lcp = new Promise((res) => {
      let best = 0;
      new PerformanceObserver((l) => { for (const e of l.getEntries()) best = Math.round(e.startTime); }).observe({ type: 'largest-contentful-paint', buffered: true });
      setTimeout(() => res(best), 1500);
    });
    let clsVal = 0;
    try {
      new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) clsVal += e.value; }).observe({ type: 'layout-shift', buffered: true });
    } catch { /* noop */ }
    return Promise.all([lcp]).then(([lcpMs]) => ({
      title: clean(document.title),
      url: location.href,
      wordCount: clean(document.body.innerText).split(' ').filter(Boolean).length,
      headings,
      tree: headings.filter((h) => !h.hidden).map((h) => `${h.tag}:${h.text.slice(0, 44)}`),
      ldTypes: [...new Set(types)],
      ldOrgFields: org,
      images: { total: imgs.length, noAlt: imgs.filter((i) => !i.hasAlt).length, emptyAlt: imgs.filter((i) => i.hasAlt && !i.alt).length, lazy: imgs.filter((i) => i.lazy).length, webp: imgs.filter((i) => /\.(webp|avif)/i.test(i.src)).length, svg: imgs.filter((i) => /\.svg/i.test(i.src)).length, jpg: imgs.filter((i) => /\.(jpe?g)/i.test(i.src)).length, oversized: imgs.filter((i) => i.nat > i.box * 2 && i.box > 0).length, list: imgs.slice(0, 24) },
      links: {
        total: anchors.length,
        internal: anchors.filter((a) => !a.external).length,
        external: anchors.filter((a) => a.external).map((a) => a.href),
        generic: anchors.filter((a) => /^(click here|read more|learn more|here|link|more)$/i.test(a.text)).length,
        empty: anchors.filter((a) => a.text === '(empty)').length,
        distinctInternal: [...new Set(anchors.filter((a) => !a.external).map((a) => a.href.split('#')[0]))].length,
      },
      cwv: { lcp: lcpMs, cls: +clsVal.toFixed(4) },
      metaLang: document.documentElement.lang,
      viewport: document.querySelector('meta[name=viewport]')?.content || null,
    }));
  });

  out.network = {
    requests: reqs.length,
    failed: reqs.filter((r) => r.status >= 400).map((r) => `${r.status} ${r.url.slice(0, 120)}`).slice(0, 20),
    jsBytes: 0,
  };
  const jsTotal = await page.evaluate(async () => {
    const list = performance.getEntriesByType('resource').filter((e) => /script/i.test(e.initiatorType) || /\.js(\?|$)/.test(e.name));
    return list.reduce((a, e) => a + (e.transferSize || 0), 0);
  });
  out.network.jsBytes = jsTotal;
  out.network.totalTransfer = await page.evaluate(() => performance.getEntriesByType('resource').reduce((a, e) => a + (e.transferSize || 0), 0) + (performance.getEntriesByType('navigation')[0]?.transferSize || 0));

  await browser.close();
  console.log(JSON.stringify(out, null, 1));
})().catch((e) => { console.error('AUDIT FAILED:', e); process.exit(1); });
