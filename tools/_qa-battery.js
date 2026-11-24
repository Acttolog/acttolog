// Temporary: run the home QA battery serially against one base.
const { spawnSync } = require('child_process');
const BASE = process.argv[2] || 'http://127.0.0.1:8150';

const SUITES = [
  ['home-mobile-qa', [BASE], {}],
  ['deck-qa', [], { DECK_BASE: BASE }],
  ['home-descent-qa', [], { HOME_BASE: BASE }],
  ['notice-qa', [], { DECK_BASE: BASE }],
  ['mobile-sweep', [BASE], {}],
  ['nepal-qa', [BASE], {}],
  ['world-qa', [BASE], {}],
  ['auth-notice-qa', [BASE], {}],
  ['arcade-qa', [], { ARCADE_QA_BASE: BASE }],
  ['lk-dl-qa', [], { LK_BASE: BASE }],
];

const only = process.argv[3];
const results = [];
for (const [name, args, env] of SUITES) {
  if (only && name !== only) continue;
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [`tools/${name}.js`, ...args], {
    env: { ...process.env, ...env },
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    timeout: 15 * 60 * 1000,
  });
  const out = (r.stdout || '') + (r.stderr || '');
  require('fs').writeFileSync(`/tmp/atl-qa-${name}.log`, out);
  const fails = out.split('\n').filter((l) => /^\s*FAIL/.test(l));
  const oks = out.split('\n').filter((l) => /^\s*ok\s/.test(l)).length;
  results.push({ name, code: r.status, oks, fails, secs: Math.round((Date.now() - t0) / 1000) });
  console.log(`\n### ${name}  exit=${r.status}  ok=${oks}  fail=${fails.length}  ${Math.round((Date.now() - t0) / 1000)}s`);
  fails.slice(0, 12).forEach((f) => console.log('   ' + f.trim().slice(0, 220)));
}
console.log('\n===== SUMMARY =====');
results.forEach((r) => console.log(`${r.code === 0 ? 'PASS' : 'FAIL'}  ${r.name}  ok=${r.oks} fail=${r.fails.length}`));
console.log('TOTAL FAILING SUITES: ' + results.filter((r) => r.code !== 0).length);