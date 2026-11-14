const h = require('fs').readFileSync('./.shots/home-live.html', 'utf8');
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const txt = h
  .replace(/<script[\s\S]*?<\/script>/g, ' ')
  .replace(/<style[\s\S]*?<\/style>/g, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&[a-z]+;|&#\d+;/gi, ' ')
  .replace(/\s+/g, ' ')
  .trim();
const lower = txt.toLowerCase();
const first = lower.slice(0, 600);
const terms = ['nepal', 'nepali', 'thesis', 'research', 'spss', 'stata', 'course', 'academy', 'training',
  'game', 'arcade', 'entertainment', 'blog', 'resource', 'digital', 'service', 'startup', 'seo',
  'artificial intelligence', 'contact', 'kathmandu', 'works', 'solution', 'tools', 'learn'];
console.log('crawlable words on homepage:', txt.split(' ').length);
console.log('term                     count  in-first-600-chars');
for (const t of terms) {
  const n = (lower.match(new RegExp(`\\b${esc(t)}\\b`, 'g')) || []).length;
  console.log(t.padEnd(24), String(n).padStart(4), '   ', first.includes(t) ? 'YES' : '-');
}
console.log('\nFIRST 320 CHARS OF CRAWLABLE TEXT:\n' + txt.slice(0, 320));
console.log('\nTITLE TAG:', (h.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1]);
console.log('TITLE chars:', ((h.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '').length);
const desc = (h.match(/<meta name="description" content="([^"]*)"/i) || [])[1] || '';
console.log('DESC chars:', desc.length);
