import nepalJson from './nepal.json';

/**
 * Nepal tourism guide — bundled, typed, bilingual content.
 * Follows the same seed-content pattern as the rest of the ACTTOLOG content
 * layer: real copy, no fabricated metrics, `{ en, ne? }` resolution.
 * Server-side only; consumers receive plain typed objects.
 */

export interface Bi { en: string; ne?: string }

export type PlaceType =
  | 'heritage' | 'mountain' | 'lake' | 'wildlife' | 'village'
  | 'monastery' | 'viewpoint' | 'city' | 'cave' | 'landscape';

export interface NepalRegion {
  id: string; name: Bi; center: [number, number]; zoom: number;
  accent: string; blurb: Bi;
}

export interface NepalPlace {
  id: string; name: Bi; region: string; type: PlaceType;
  coords: [number, number]; unesco?: boolean; desc: Bi; image: string;
  best: string[]; tags: string[]; note?: Bi;
}

export interface NepalFestival {
  id: string; name: Bi; when: Bi; where: string; accent: string; desc: Bi;
  /** Photo slug stem under public/media/nepal, only when it truly depicts this festival. */
  image?: string;
}

export interface NepalCulture { id: string; name: Bi; where: string; icon: string; desc: Bi }

export interface NepalDish { id: string; name: Bi; desc: Bi; image: string }

export interface NepalWildlife { id: string; name: Bi; where: string; status: Bi; desc: Bi }

export interface NepalTrek {
  id: string; name: Bi; region: string; days: string; high: string;
  grade: Bi; permit: string[]; season: string[]; desc: Bi;
}

export interface NepalSeason {
  id: string; name: Bi; verdict: Bi; accent: string; temp: Bi; desc: Bi;
}

export interface NepalPermit { id: string; title: Bi; body: Bi; where: string }

export interface NepalGuideline { title: Bi; body: Bi }

export interface NepalVideo {
  id: string; title: Bi; desc: Bi; kind: 'file' | 'embed';
  src: string; poster?: string; mood: string; credit?: string;
}

export interface NepalStat { n: string; sub?: string; label: Bi }

export interface NepalGuide {
  meta: { route: string; updated: string; disclaimer: Bi };
  hero: { kicker: Bi; title: Bi; line: Bi; image: string };
  stats: NepalStat[];
  regions: NepalRegion[];
  places: NepalPlace[];
  festivals: NepalFestival[];
  culture: NepalCulture[];
  cuisine: NepalDish[];
  wildlife: NepalWildlife[];
  treks: NepalTrek[];
  seasons: NepalSeason[];
  permits: NepalPermit[];
  etiquette: Bi[];
  safety: NepalGuideline[];
  practical: {
    visa: Bi[]; money: Bi[]; getting_around: Bi[]; essentials: Bi[];
  };
  videos: NepalVideo[];
  guidelines_note: Bi;
}

const guide = nepalJson as unknown as NepalGuide;

export const nepalGuide = (): NepalGuide => guide;

export const nepalRegions = (): NepalRegion[] => guide.regions;

export const regionName = (id: string, locale: 'en' | 'ne'): string => {
  const r = guide.regions.find((x) => x.id === id);
  if (!r) return '';
  return r.name[locale] || r.name.en;
};

/** Resolve a bilingual value the same way `@/lib/content` does. */
export const bi = (v: Bi | undefined, locale: 'en' | 'ne'): string =>
  !v ? '' : (locale === 'ne' && v.ne ? v.ne : v.en);

/** Places grouped by region, for the map panel and the index grid. */
export const placesByRegion = (): Record<string, NepalPlace[]> => {
  const map: Record<string, NepalPlace[]> = {};
  for (const p of guide.places) (map[p.region] ||= []).push(p);
  for (const r of guide.regions) map[r.id] ||= [];
  return map;
};
