/**
 * Pages site harvester — builds the GitHub Pages mirror from the SSR build
 * output (no second compile): prerendered HTML + static assets + crawled
 * guest-state dynamic pages. Client nav falls back to full page loads on
 * static hosts; search/AI degrade to the bundled index.
 */
const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT = process.cwd();
const OUT = path.join(ROOT, '.pages-site');
const APP = path.join(ROOT, '.next/server/app');
const PORT = 3100;

const CRAWL = [
  '/search', '/contact', '/my', '/my/saved', '/my/recent', '/my/academy', '/my/games',
  '/my/darkroom', '/my/ai', '/my/notifications', '/my/settings', '/admin/login',
];

const copy = (src, dest) => fs.cpSync(src, dest, { recursive: true });

function walkHtml(dir, base, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walkHtml(p, base, out);
    else if (e.name.endsWith('.html')) out.push(p);
  }
}

const get = (p) => new Promise((r) => {
  http.get({ host: '127.0.0.1', port: PORT, path: p, headers: { 'User-Agent': 'acttolog-harvest' } }, (res) => {
    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) { r({ s: res.statusCode, b: '', redir: res.headers.location }); res.resume(); return; }
    let b = ''; res.on('data', (d) => (b += d)); res.on('end', () => r({ s: res.statusCode, b }));
  }).on('error', (e) => r({ s: 0, b: e.message }));
});

(async () => {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });

  // public assets + compiled static assets
  copy(path.join(ROOT, 'public'), OUT);
  fs.mkdirSync(path.join(OUT, '_next'), { recursive: true });
  copy(path.join(ROOT, '.next/static'), path.join(OUT, '_next/static'));

  // prerendered pages
  const htmls = [];
  walkHtml(APP, APP, htmls);
  let n = 0;
  for (const f of htmls) {
    const rel = path.relative(APP, f);
    if (rel.includes('[') || rel.includes(']')) continue;
    const dest = path.join(OUT, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(f, dest);
    // also emit directory-index form so GitHub Pages serves /route/ as well as /route
    if (rel.endsWith('.html') && !rel.endsWith('index.html')) {
      const dirIndex = path.join(OUT, rel.slice(0, -5), 'index.html');
      if (!fs.existsSync(dirIndex)) {
        fs.mkdirSync(path.dirname(dirIndex), { recursive: true });
        fs.copyFileSync(f, dirIndex);
      }
    }
    n++;
  }
  console.log('prerendered pages copied:', n);

  // flight payloads for client-side router (RSC .txt segments)
  let t = 0;
  const walkTxt = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walkTxt(p);
      else if (e.name.endsWith('.txt') || e.name.endsWith('.rsc') || e.name.endsWith('.meta')) {
        const rel = path.relative(APP, p);
        if (rel.includes('[')) continue;
        const dest = path.join(OUT, rel);
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.copyFileSync(p, dest);
        t++;
      }
    }
  };
  walkTxt(APP);
  console.log('flight payloads copied:', t);

  // crawled guest-state dynamic pages
  for (const p of CRAWL) {
    const r = await get(p);
    if (r.s === 200 && r.b.includes('<!DOCTYPE html>')) {
      const dest = path.join(OUT, p.replace(/^\//, '') + '.html');
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, r.b);
      console.log('crawled', p, '→', path.relative(OUT, dest));
    } else console.log('crawl skip', p, r.s, r.redir || '');
  }

  fs.writeFileSync(path.join(OUT, '.nojekyll'), '');
  console.log('PAGES SITE READY →', OUT, '| files:', fs.readdirSync(OUT).length);
})();
