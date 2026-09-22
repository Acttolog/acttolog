const https = require('https');
const dns = require('dns');
const rdap = () => new Promise((r) => {
  https.get({ host: 'rdap.verisign.com', path: '/com/v1/domain/acttolog.com', headers: { 'User-Agent': 'acttolog-watch', Accept: 'application/rdap+json' } },
    (res) => { let b = ''; res.on('data', (d) => (b += d)); res.on('end', () => r({ s: res.statusCode, b })); }).on('error', (e) => r({ s: 0, b: e.message }));
});
const res1 = (type, name) => new Promise((r) => {
  const d = new dns.Resolver(); d.setServers(['8.8.8.8']);
  const cb = (e, v) => r(e ? null : v);
  if (type === 'A') d.resolve4(name, cb); else d.resolve(name, 'CNAME', cb);
});
const site = (host) => new Promise((r) => {
  https.get({ host, path: '/', headers: { 'User-Agent': 'acttolog-watch' } }, (res) => { let b = ''; res.on('data', (d) => (b += d)); res.on('end', () => r({ s: res.statusCode, brand: b.includes('ACTTOLOG') })); }).on('error', (e) => r({ s: 0, brand: false }));
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const start = Date.now();
  let stage = 0;
  while (Date.now() - start < 20 * 60 * 1000) {
    const t = Math.round((Date.now() - start) / 60000);
    if (stage === 0) {
      const r = await rdap();
      if (r.s === 200) {
        const j = JSON.parse(r.b);
        console.log(`[t+${t}m] REGISTERED ✓ nameservers: ${(j.nameservers || []).map((n) => n.ldhName).join(', ') || '(none yet)'}`);
        stage = 1;
      } else { console.log(`[t+${t}m] registry: not yet…`); await sleep(60000); continue; }
    }
    if (stage >= 1) {
      const a = await res1('A', 'acttolog.com');
      const cn = await res1('CNAME', 'www.acttolog.com');
      const wa = await res1('A', 'www.acttolog.com');
      if (a || cn || wa) {
        console.log(`[t+${t}m] DNS LIVE ✓ A@:${JSON.stringify(a)} CNAMEwww:${JSON.stringify(cn)} Awww:${JSON.stringify(wa)}`);
        stage = 2;
      } else { console.log(`[t+${t}m] registered, DNS records not visible yet…`); await sleep(60000); continue; }
    }
    if (stage === 2) {
      const w = await site('www.acttolog.com');
      const apex = await site('acttolog.com');
      console.log(`[t+${t}m] https://www.acttolog.com → ${w.s} brand:${w.brand} | apex → ${apex.s}`);
      if (w.s === 200 && w.brand) { console.log('SITE LIVE ON CANONICAL DOMAIN 🎉'); process.exit(0); }
      await sleep(60000);
    }
  }
  console.log('WATCH WINDOW ENDED — current stage:', stage);
})();
