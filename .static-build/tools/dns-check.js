const dns = require('dns');
const q = (servers, type, name) => new Promise((resolve) => {
  const d = new dns.Resolver();
  d.setServers(servers);
  const cb = (e, v) => resolve(e ? { ok: false, e: e.code || e.message } : { ok: true, v });
  if (type === 'A') d.resolve4(name, cb);
  else if (type === 'NS') d.resolve(name, 'NS', cb);
  else if (type === 'CNAME') d.resolve(name, 'CNAME', cb);
  else if (type === 'SOA') d.resolveSoa(name, cb);
});
(async () => {
  for (const servers of [['8.8.8.8'], ['1.1.1.1']]) {
    const tag = servers[0];
    const soa = await q(servers, 'SOA', 'acttolog.com');
    const ns = await q(servers, 'NS', 'acttolog.com');
    const a = await q(servers, 'A', 'acttolog.com');
    const www = await q(servers, 'A', 'www.acttolog.com');
    const cn = await q(servers, 'CNAME', 'www.acttolog.com');
    console.log(`via ${tag}`);
    console.log('  SOA acttolog.com :', JSON.stringify(soa));
    console.log('  NS  acttolog.com :', JSON.stringify(ns));
    console.log('  A   acttolog.com :', JSON.stringify(a));
    console.log('  A   www          :', JSON.stringify(www));
    console.log('  CNAME www        :', JSON.stringify(cn));
  }
})();
