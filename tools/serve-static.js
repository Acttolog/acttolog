// Minimal static server for local QA of the harvested Pages artifact.
// Supports HTTP Range (video will not start without it) and modern image types.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(process.argv[2] || '.pages-site');
const PORT = Number(process.argv[3] || 8140);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.pdf': 'application/pdf',
  '.rsc': 'text/plain; charset=utf-8',
  '.segments': 'text/plain; charset=utf-8',
  '.meta': 'text/plain; charset=utf-8',
};

http
  .createServer((req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0]);
    // path.join keeps a trailing separator, which would turn the sibling-.html
    // fallback into "games/.html". Drop it so /games/ resolves like /games.
    const clean = url.length > 1 ? url.replace(/[\\/]+$/, '') : url;
    const file = path.join(ROOT, clean);
    if (!file.startsWith(ROOT)) {
      res.writeHead(403).end('no');
      return;
    }
    // Resolve like GitHub Pages: exact file → dir/index.html → sibling .html.
    // Next export emits both `route.html` and a `route/` dir of RSC segments,
    // so a directory without index.html must fall back to its sibling .html.
    let target = null;
    if (fs.existsSync(file)) {
      if (fs.statSync(file).isDirectory()) {
        const idx = path.join(file, 'index.html');
        if (fs.existsSync(idx)) target = idx;
        else if (fs.existsSync(`${file}.html`)) target = `${file}.html`;
      } else {
        target = file;
      }
    }
    if (!target && fs.existsSync(`${file}.html`)) target = `${file}.html`;
    if (!target) {
      res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' });
      res.end('<!doctype html><title>404</title>not found');
      return;
    }
    const type = TYPES[path.extname(target).toLowerCase()] || 'application/octet-stream';
    const size = fs.statSync(target).size;
    const range = req.headers.range;
    if (range) {
      const m = /bytes=(\d*)-(\d*)/.exec(range);
      const start = m && m[1] ? Number(m[1]) : 0;
      const end = m && m[2] ? Number(m[2]) : size - 1;
      res.writeHead(206, {
        'content-type': type,
        'content-length': end - start + 1,
        'content-range': `bytes ${start}-${end}/${size}`,
        'accept-ranges': 'bytes',
      });
      fs.createReadStream(target, { start, end }).pipe(res);
      return;
    }
    res.writeHead(200, { 'content-type': type, 'content-length': size, 'accept-ranges': 'bytes' });
    fs.createReadStream(target).pipe(res);
  })
  .listen(PORT, () => console.log(`serving ${ROOT} on http://127.0.0.1:${PORT}`));
