import type { Bi, Locale } from '@/lib/content/types';

/* ── formatting ─────────────────────────────────────────────────── */

export const KTM = 'Asia/Kathmandu';

export const nf = (n: number | undefined | null): string => Number(n || 0).toLocaleString('en-US');

export function fdate(d: string | Date | undefined | null): string {
  if (!d) return '—';
  const t = new Date(d);
  return isNaN(t.getTime()) ? '—' : t.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function fktm(d: string | Date | undefined | null): string {
  if (!d) return '—';
  try {
    return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: KTM }).format(new Date(d)) + ' NPT';
  } catch {
    return fdate(d);
  }
}

/** Reading time in minutes (~210 wpm, prototype `rt()`). */
export const rt = (t: string | undefined): number =>
  Math.max(1, Math.round(String(t || '').split(/\s+/).filter(Boolean).length / 210));

export function slugify(s: string): string {
  return String(s || '').toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').slice(0, 70);
}

/* ── currency ───────────────────────────────────────────────────── */

export function money(o: { npr?: number; usd?: number } | undefined, cur: 'NPR' | 'USD', rate: number, locale: Locale): string {
  if (!o) return '';
  const npr = Number(o.npr || 0);
  const usd = Number(o.usd || 0);
  const use = cur === 'NPR';
  const v = use ? (npr || usd * rate) : (usd || (npr ? npr / rate : 0));
  if (!v) return locale === 'ne' ? 'विशेष दायरा' : 'Custom scope';
  return use ? `रु ${nf(Math.round(v))} NPR` : `$${nf(Math.round(v * 100) / 100)} USD`;
}

/* ── procedural brand art (prototype `art:` scheme → SVG data URI) ─
   Deterministic, theme-aware gradient art used wherever CMS imagery
   references `art:<kind>`. Replaced by real uploads via the media
   library as content matures.                                        */

const PALETTES: Record<string, [string, string, string, string]> = {
  nebula: ['#04060f', '#35e0ff', '#7c5cff', '#ff4ecd'],
  research: ['#04080f', '#35e0ff', '#4f7dff', '#9be8ff'],
  stage: ['#0a0410', '#ff4ecd', '#35e0ff', '#7c5cff'],
  academy: ['#05081a', '#7c5cff', '#35e0ff', '#c9b6ff'],
  editorial: ['#07080c', '#35e0ff', '#7c5cff', '#e8eeff'],
  offers: ['#07070c', '#f5c26b', '#35e0ff', '#e9f2ff'],
  horror: ['#0a0410', '#ff5f7a', '#7c5cff', '#35e0ff'],
  music: ['#04060f', '#ff4ecd', '#35e0ff', '#7c5cff'],
  games: ['#04120a', '#3ddc97', '#35e0ff', '#7c5cff'],
};

function artSvg(kind: string, w = 1200, h = 675): string {
  const p = PALETTES[kind] || PALETTES.nebula;
  const id = `a${Math.abs(hash(kind + w + h)).toString(36)}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
<defs>
<linearGradient id="${id}g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${p[0]}"/><stop offset="1" stop-color="#02030a"/></linearGradient>
<radialGradient id="${id}1" cx="30%" cy="35%" r="60%"><stop offset="0" stop-color="${p[1]}" stop-opacity=".28"/><stop offset="1" stop-color="${p[1]}" stop-opacity="0"/></radialGradient>
<radialGradient id="${id}2" cx="75%" cy="70%" r="55%"><stop offset="0" stop-color="${p[2]}" stop-opacity=".24"/><stop offset="1" stop-color="${p[2]}" stop-opacity="0"/></radialGradient>
<radialGradient id="${id}3" cx="55%" cy="15%" r="45%"><stop offset="0" stop-color="${p[3]}" stop-opacity=".14"/><stop offset="1" stop-color="${p[3]}" stop-opacity="0"/></radialGradient>
</defs>
<rect width="${w}" height="${h}" fill="url(#${id}g)"/>
<rect width="${w}" height="${h}" fill="url(#${id}1)"/>
<rect width="${w}" height="${h}" fill="url(#${id}2)"/>
<rect width="${w}" height="${h}" fill="url(#${id}3)"/>
${stars(w, h, kind)}
</svg>`;
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

function stars(w: number, h: number, kind: string): string {
  let s = hash(kind) || 7;
  const rn = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  let out = '';
  const n = 90;
  for (let i = 0; i < n; i++) {
    const x = (rn() * w).toFixed(1), y = (rn() * h).toFixed(1), r = (rn() * 1.5 + 0.3).toFixed(2);
    out += `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" opacity="${(rn() * 0.6 + 0.1).toFixed(2)}"/>`;
  }
  return out;
}

const artCache = new Map<string, string>();

/** Resolve a CMS image reference (`art:kind`, URL, or path) to a usable src. */
export function resolveImage(src: string | Bi | undefined, kind = 'nebula'): string {
  const raw = typeof src === 'object' && src ? src.en : (src || '');
  const key = raw || `art:${kind}`;
  if (artCache.has(key)) return artCache.get(key)!;
  let out: string;
  if (!raw) out = svgUri(artSvg(kind));
  else if (raw.startsWith('art:')) out = svgUri(artSvg(raw.slice(4)));
  else out = raw;
  artCache.set(key, out);
  return out;
}

function svgUri(svg: string): string {
  return `data:image/svg+xml,${encodeURIComponent(svg.replace(/\s+/g, ' '))}`;
}

/* ── markdown (prototype `md2html`, escape-first) ───────────────── */

export function md2html(src: string | undefined): string {
  if (!src) return '';
  const inl = (t: string) =>
    escapeHtml(t)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code>$1</code>');
  const ls = String(src).replace(/\r/g, '').split('\n');
  let out = '', ul = 0, ol = 0;
  const p: string[] = [];
  const fp = () => { if (p.length) { out += '<p>' + inl(p.join(' ')) + '</p>'; p.length = 0; } };
  const cl = () => { if (ul) { out += '</ul>'; ul = 0; } if (ol) { out += '</ol>'; ol = 0; } };
  for (const raw of ls) {
    const l = raw.trimEnd();
    let m: RegExpMatchArray | null;
    if (!l.trim()) { fp(); cl(); continue; }
    if (/^---+$/.test(l.trim())) { fp(); cl(); out += '<hr>'; continue; }
    if ((m = l.match(/^(#{2,4})\s+(.*)$/))) { fp(); cl(); const n = m[1].length; out += `<h${n}>` + inl(m[2]) + `</h${n}>`; continue; }
    if ((m = l.match(/^>\s?(.*)$/))) { fp(); cl(); out += '<blockquote>' + inl(m[1]) + '</blockquote>'; continue; }
    if ((m = l.match(/^[-*]\s+(.*)$/))) { fp(); if (ol) { out += '</ol>'; ol = 0; } if (!ul) { out += '<ul>'; ul = 1; } out += '<li>' + inl(m[1]) + '</li>'; continue; }
    if ((m = l.match(/^\d+[.)]\s+(.*)$/))) { fp(); if (ul) { out += '</ul>'; ul = 0; } if (!ol) { out += '<ol>'; ol = 1; } out += '<li>' + inl(m[1]) + '</li>'; continue; }
    cl();
    p.push(l.trim());
  }
  fp(); cl();
  return out;
}

export function escapeHtml(s: unknown): string {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);
}

/* ── csv export (prototype `toCSV`) ─────────────────────────────── */

export function toCSV(rows: Record<string, unknown>[]): string {
  if (!rows.length) return '';
  const ks = Object.keys(rows[0]);
  return [ks.join(','), ...rows.map((r) =>
    ks.map((k) => {
      const v = r[k] == null ? '' : String(r[k]);
      return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
    }).join(','))].join('\n');
}
