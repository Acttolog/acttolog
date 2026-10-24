'use client';

/** Performance tiers (spec §24) — High / Medium / Low / Mobile with honest detection. */

export type QualityTier = 'high' | 'medium' | 'low' | 'mobile';
/** What the user picks: a fixed tier, or AUTO which resolves per device. */
export type QualitySetting = 'auto' | QualityTier;

export const QUALITY_KEY = 'act_quality';
export const QUALITY_TIERS: QualityTier[] = ['high', 'medium', 'low', 'mobile'];
export const QUALITY_SETTINGS: QualitySetting[] = ['auto', 'high', 'medium', 'low', 'mobile'];

/** Compact deck labels — single initials collide once MOBILE exists. */
export const QUALITY_LABEL: Record<QualitySetting, string> = {
  auto: 'AUTO', high: 'HI', medium: 'MED', low: 'LO', mobile: 'MOB',
};

const isSetting = (v: unknown): v is QualitySetting =>
  v === 'auto' || v === 'high' || v === 'medium' || v === 'low' || v === 'mobile';

export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const coarse = window.matchMedia?.('(pointer: coarse)').matches === true;
  const shortEdge = Math.min(window.innerWidth, window.innerHeight);
  return ua || (coarse && shortEdge < 700);
}

/** Resolve a user setting to the tier actually used for rendering. */
export function resolveTier(setting: QualitySetting): QualityTier {
  return setting === 'auto' ? detectTier() : setting;
}

export function detectTier(): QualityTier {
  if (typeof window === 'undefined') return 'medium';
  const params = new URLSearchParams(window.location.search);
  const forced = params.get('quality');
  if (isSetting(forced) && forced !== 'auto') return forced;

  const nav = navigator as Navigator & { deviceMemory?: number };
  const cores = nav.hardwareConcurrency || 4;
  const mem = nav.deviceMemory || 4;
  const mobile = isMobileDevice();
  const small = window.innerWidth < 900;

  // Phones get their own tier: same tessellation budget as LOW, but the
  // labels/rings a desktop LOW keeps are still worth dropping for them.
  if (mobile) return cores <= 4 && mem <= 4 ? 'low' : 'mobile';
  if ((cores <= 4 && mem <= 4) || small) return cores <= 4 && mem <= 4 ? 'low' : 'medium';
  if (cores >= 8 && mem >= 8) return 'high';
  return 'medium';
}

/** Read the persisted setting (SSR-safe; defaults to auto). */
export function readQualitySetting(): QualitySetting {
  if (typeof window === 'undefined') return 'auto';
  try {
    const q = new URLSearchParams(window.location.search).get('quality');
    if (isSetting(q)) return q;
    const stored = localStorage.getItem(QUALITY_KEY);
    if (isSetting(stored)) return stored;
  } catch { /* private mode */ }
  return 'auto';
}

export function writeQualitySetting(s: QualitySetting): void {
  try { localStorage.setItem(QUALITY_KEY, s); } catch { /* ignore */ }
}

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function webglSupported(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

export interface TierConfig {
  dpr: [number, number];
  sphereSegments: number;
  stars: number;
  particles: number;
  bloom: boolean;
  pulses: boolean;
  labels: boolean;
  rings: number;
  autoRotate: number;
  /** Tile layers past this zoom are skipped — mobile decodes tiles slowly. */
  maxTileZoom: number;
}

export const TIER_CONFIG: Record<QualityTier, TierConfig> = {
  high: { dpr: [1, 2], sphereSegments: 96, stars: 5000, particles: 700, bloom: true, pulses: true, labels: true, rings: 3, autoRotate: 0.05, maxTileZoom: 18 },
  medium: { dpr: [1, 1.5], sphereSegments: 64, stars: 2500, particles: 300, bloom: false, pulses: false, labels: true, rings: 2, autoRotate: 0.05, maxTileZoom: 17 },
  low: { dpr: [1, 1], sphereSegments: 40, stars: 900, particles: 0, bloom: false, pulses: false, labels: false, rings: 2, autoRotate: 0.03, maxTileZoom: 16 },
  mobile: { dpr: [1, 1.25], sphereSegments: 44, stars: 1100, particles: 0, bloom: false, pulses: false, labels: false, rings: 1, autoRotate: 0.035, maxTileZoom: 16 },
};
