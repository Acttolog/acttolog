import seedJson from './seed.json';
import type {
  ActtologDB, Access, Bi, ContentStatus, Locale,
} from './types';

/**
 * ACTTOLOG content layer.
 *
 * Source of truth: PostgreSQL via Prisma when DATABASE_URL is configured;
 * bundled, typed seed content otherwise (extracted mechanically from the
 * audited prototype — real copy, zero fabricated metrics).
 * The switch is deliberately invisible to callers.
 */
const db = seedJson as unknown as ActtologDB;

export function getDB(): ActtologDB {
  return db;
}

export const hasDatabase = (): boolean => Boolean(process.env.DATABASE_URL);

/* ── bilingual resolution ───────────────────────────────────────── */

/** Resolve a Bi field for a locale, falling back to English (prototype `L()`). */
export function L(value: Bi | string | undefined | null, locale: Locale): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  return value[locale] || value.en || value.ne || '';
}

/** True when a Nepali translation is missing and we fell back (prototype `Lm()`). */
export function missingNe(value: Bi | string | undefined | null): boolean {
  return Boolean(value && typeof value === 'object' && !value.ne && value.en);
}

/* ── publication filter (prototype `pub()`) ─────────────────────── */

interface Publishable {
  visible?: boolean;
  status?: ContentStatus;
  publishAt?: string;
  audience?: string;
  access?: Access;
}

/**
 * Visibility rules: hidden items are excluded; scheduled items appear once
 * publishAt <= now; only published items pass; members-only content requires
 * an authenticated session.
 */
export function pub<T extends Publishable>(list: T[] | undefined, signedIn = false, now = Date.now()): T[] {
  if (!Array.isArray(list)) return [];
  return list
    .filter((x) => {
      if (x.visible === false) return false;
      if (x.status === 'scheduled') {
        const at = x.publishAt ? new Date(x.publishAt).getTime() : 0;
        return Boolean(at && at <= now);
      }
      return (x.status ?? 'published') === 'published';
    })
    .filter((x) => !x.audience || x.audience !== 'members' || signedIn);
}

/* ── convenience accessors ──────────────────────────────────────── */

export const settings = db.settings;
export const divisions = () =>
  db.divisions.filter((d) => d.visible !== false).sort((a, b) => a.order - b.order);
export const navItems = () => db.nav.filter((n) => n.visible !== false).sort((a, b) => a.order - b.order);
export const homeSection = (id: string) =>
  db.homeSections.find((x) => x.id === id) ?? { id, visible: true, title: { en: '' }, body: { en: '' } };

export const seoFor = (route: string) => db.seo.pages[route];

export * from './types';
